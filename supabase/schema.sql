-- Gib Trades — customer accounts slice
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)

create table if not exists public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  address text not null,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Customers can view their own profile"
  on public.customers for select
  using (auth.uid() = id);

create policy "Customers can create their own profile"
  on public.customers for insert
  with check (auth.uid() = id);

create policy "Customers can update their own profile"
  on public.customers for update
  using (auth.uid() = id);

-- Gib Trades — business accounts slice

create table if not exists public.businesses (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

create policy "Businesses can view their own account"
  on public.businesses for select
  using (auth.uid() = id);

create policy "Businesses can create their own account"
  on public.businesses for insert
  with check (auth.uid() = id);

create policy "Businesses can update their own account"
  on public.businesses for update
  using (auth.uid() = id);

-- Gib Trades — marketplace slice (real listings, requests, chat, reviews)

alter table public.businesses
  add column if not exists category_ids text[] not null default '{}',
  add column if not exists tagline text not null default '',
  add column if not exists description text not null default '',
  add column if not exists price_range text not null default '££',
  add column if not exists services text[] not null default '{}',
  add column if not exists available_now boolean not null default false,
  add column if not exists tier text not null default 'standard',
  add column if not exists is_approved boolean not null default true;

create policy "Anyone can view approved businesses"
  on public.businesses for select
  using (is_approved = true);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  company_name text not null,
  category_name text not null,
  type text not null,
  customer_name text not null,
  phone text not null,
  address text not null,
  job_details text not null default '',
  preferred_date text not null default '',
  scheduled_slot text not null default '',
  status text not null default 'pending',
  job_value numeric,
  commission numeric,
  customer_confirmed boolean not null default false,
  quoted_amount numeric,
  quote_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.service_requests enable row level security;

create policy "Customers can view their own requests"
  on public.service_requests for select
  using (auth.uid() = customer_id);

create policy "Businesses can view requests addressed to them"
  on public.service_requests for select
  using (auth.uid() = business_id);

create policy "Customers can create requests"
  on public.service_requests for insert
  with check (auth.uid() = customer_id);

create policy "Customers can update their own requests"
  on public.service_requests for update
  using (auth.uid() = customer_id);

create policy "Businesses can update requests addressed to them"
  on public.service_requests for update
  using (auth.uid() = business_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  sender text not null,
  kind text not null,
  text text,
  amount numeric,
  image_uri text,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Participants can view chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = chat_messages.request_id
        and (r.customer_id = auth.uid() or r.business_id = auth.uid())
    )
  );

create policy "Participants can send chat messages"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.service_requests r
      where r.id = chat_messages.request_id
        and (r.customer_id = auth.uid() or r.business_id = auth.uid())
    )
  );

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  rating int not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Anyone can view reviews"
  on public.reviews for select
  using (true);

create policy "Customers can create their own reviews"
  on public.reviews for insert
  with check (auth.uid() = customer_id);

-- Gib Trades — admin approval slice
-- Businesses are no longer public the moment they sign up: is_approved now
-- defaults to false, and admin has to explicitly approve. There is no
-- self-signup for admins — rows only ever get added to public.admins by
-- hand in the SQL editor (see bootstrap instructions).

create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "Admins can view their own admin row"
  on public.admins for select
  using (auth.uid() = id);

alter table public.businesses
  add column if not exists application_status text not null default 'pending',
  add column if not exists business_status text not null default 'active',
  add column if not exists rejection_reason text not null default '';

alter table public.businesses alter column is_approved set default false;

drop policy if exists "Anyone can view approved businesses" on public.businesses;
create policy "Anyone can view approved businesses"
  on public.businesses for select
  using (is_approved = true and business_status = 'active');

create policy "Admins can view all businesses"
  on public.businesses for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create policy "Admins can update any business"
  on public.businesses for update
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

alter table public.service_requests
  add column if not exists commission_paid boolean not null default false;

create policy "Admins can view all requests"
  on public.service_requests for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create policy "Admins can update any request"
  on public.service_requests for update
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create table if not exists public.business_flags (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

alter table public.business_flags enable row level security;

create policy "Admins can view flags"
  on public.business_flags for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create policy "Admins can create flags"
  on public.business_flags for insert
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

-- Gib Trades — cover photo + portfolio gallery slice

alter table public.businesses
  add column if not exists cover_photo_url text;

create table if not exists public.business_gallery_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.business_gallery_images enable row level security;

create policy "Anyone can view gallery images of visible businesses"
  on public.business_gallery_images for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_gallery_images.business_id
        and b.is_approved = true
        and b.business_status = 'active'
    )
  );

create policy "Businesses can view their own gallery images"
  on public.business_gallery_images for select
  using (auth.uid() = business_id);

create policy "Businesses can add their own gallery images"
  on public.business_gallery_images for insert
  with check (auth.uid() = business_id);

create policy "Businesses can delete their own gallery images"
  on public.business_gallery_images for delete
  using (auth.uid() = business_id);

-- Storage bucket for cover photos + gallery images. Files are stored under
-- {businessId}/... so the folder name itself enforces per-business write
-- access — a business can only ever write inside its own folder.
insert into storage.buckets (id, name, public)
values ('business-media', 'business-media', true)
on conflict (id) do nothing;

create policy "Business media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'business-media');

create policy "Businesses can upload their own media"
  on storage.objects for insert
  with check (bucket_id = 'business-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Businesses can update their own media"
  on storage.objects for update
  using (bucket_id = 'business-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Businesses can delete their own media"
  on storage.objects for delete
  using (bucket_id = 'business-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Gib Trades — multi-listing slice
-- A business account can now own several public listings (different trades,
-- different shopfronts, etc). Listing-facing fields move off `businesses`
-- (which becomes purely the login/account/subscription record) onto a new
-- `business_listings` table. Every existing business gets exactly one
-- migrated listing that reuses the business's own id as the listing id, so
-- every existing service_request/review/gallery-image foreign key keeps
-- pointing at the right row with no data rewrite needed.

create table if not exists public.business_listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text not null default '',
  category_ids text[] not null default '{}',
  tagline text not null default '',
  description text not null default '',
  price_range text not null default '££',
  services jsonb not null default '[]',
  available_now boolean not null default false,
  cover_photo_url text,
  created_at timestamptz not null default now()
);

insert into public.business_listings
  (id, business_id, name, phone, category_ids, tagline, description, price_range, services, available_now, cover_photo_url, created_at)
select
  id,
  id,
  name,
  phone,
  category_ids,
  tagline,
  description,
  price_range,
  (select coalesce(jsonb_agg(jsonb_build_object('name', s, 'priceFrom', null)), '[]'::jsonb) from unnest(services) as s),
  available_now,
  cover_photo_url,
  created_at
from public.businesses
on conflict (id) do nothing;

alter table public.businesses
  drop column if exists category_ids,
  drop column if exists tagline,
  drop column if exists description,
  drop column if exists price_range,
  drop column if exists services,
  drop column if exists available_now,
  drop column if exists cover_photo_url;

alter table public.business_listings enable row level security;

create policy "Anyone can view listings of approved businesses"
  on public.business_listings for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_listings.business_id
        and b.is_approved = true
        and b.business_status = 'active'
    )
  );

create policy "Businesses can view their own listings"
  on public.business_listings for select
  using (auth.uid() = business_id);

create policy "Businesses can create their own listings"
  on public.business_listings for insert
  with check (auth.uid() = business_id);

create policy "Businesses can update their own listings"
  on public.business_listings for update
  using (auth.uid() = business_id);

create policy "Businesses can delete their own listings"
  on public.business_listings for delete
  using (auth.uid() = business_id);

create policy "Admins can view all listings"
  on public.business_listings for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- service_requests, reviews and gallery images now point at a specific
-- listing rather than the business account directly.
alter table public.service_requests rename column business_id to listing_id;
alter table public.service_requests drop constraint if exists service_requests_business_id_fkey;
alter table public.service_requests
  add constraint service_requests_listing_id_fkey foreign key (listing_id) references public.business_listings (id) on delete cascade;

drop policy if exists "Businesses can view requests addressed to them" on public.service_requests;
create policy "Businesses can view requests addressed to them"
  on public.service_requests for select
  using (exists (select 1 from public.business_listings l where l.id = service_requests.listing_id and l.business_id = auth.uid()));

drop policy if exists "Businesses can update requests addressed to them" on public.service_requests;
create policy "Businesses can update requests addressed to them"
  on public.service_requests for update
  using (exists (select 1 from public.business_listings l where l.id = service_requests.listing_id and l.business_id = auth.uid()));

alter table public.reviews rename column business_id to listing_id;
alter table public.reviews drop constraint if exists reviews_business_id_fkey;
alter table public.reviews
  add constraint reviews_listing_id_fkey foreign key (listing_id) references public.business_listings (id) on delete cascade;

alter table public.business_gallery_images rename column business_id to listing_id;
alter table public.business_gallery_images drop constraint if exists business_gallery_images_business_id_fkey;
alter table public.business_gallery_images
  add constraint business_gallery_images_listing_id_fkey foreign key (listing_id) references public.business_listings (id) on delete cascade;

drop policy if exists "Anyone can view gallery images of visible businesses" on public.business_gallery_images;
create policy "Anyone can view gallery images of visible listings"
  on public.business_gallery_images for select
  using (
    exists (
      select 1 from public.business_listings l
      join public.businesses b on b.id = l.business_id
      where l.id = business_gallery_images.listing_id
        and b.is_approved = true
        and b.business_status = 'active'
    )
  );

drop policy if exists "Businesses can view their own gallery images" on public.business_gallery_images;
create policy "Businesses can view their own gallery images"
  on public.business_gallery_images for select
  using (exists (select 1 from public.business_listings l where l.id = business_gallery_images.listing_id and l.business_id = auth.uid()));

drop policy if exists "Businesses can add their own gallery images" on public.business_gallery_images;
create policy "Businesses can add their own gallery images"
  on public.business_gallery_images for insert
  with check (exists (select 1 from public.business_listings l where l.id = business_gallery_images.listing_id and l.business_id = auth.uid()));

drop policy if exists "Businesses can delete their own gallery images" on public.business_gallery_images;
create policy "Businesses can delete their own gallery images"
  on public.business_gallery_images for delete
  using (exists (select 1 from public.business_listings l where l.id = business_gallery_images.listing_id and l.business_id = auth.uid()));

-- Storage paths for a listing's media are now {businessId}/{listingId}/...
-- — the top-level folder is still the auth uid, so the existing per-business
-- storage policies above keep working unchanged.

-- Gib Trades — remove subscription tiers, flat commission, live listing updates
-- Subscriptions are gone: every business is on equal footing, no more
-- tier-gated features (availability indicator, rescheduling) and no more
-- per-tier commission rate. Commission is now computed in the app at
-- completion time (10% up to £500, 5% above), so the column simply goes away.
alter table public.businesses drop column if exists tier;

-- Realtime: a saved/edited listing, or a newly-approved business, now pushes
-- straight to browsing customers' apps instead of waiting for their next
-- manual refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'business_listings'
  ) then
    alter publication supabase_realtime add table public.business_listings;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'businesses'
  ) then
    alter publication supabase_realtime add table public.businesses;
  end if;
end $$;

-- Gib Trades — commission payments (Stripe)
-- Businesses still get paid directly by customers for the job itself; this
-- only covers the platform's cut. A payment is created (status 'pending')
-- with a snapshot of exactly which completed jobs it covers, so a job that
-- completes mid-checkout can't accidentally get swept into someone else's
-- payment. Only the create-commission-checkout and stripe-webhook edge
-- functions (service role) ever write to these tables — app clients get
-- read-only access to their own rows via RLS.

create table if not exists public.commission_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  amount numeric(10, 2) not null,
  stripe_checkout_session_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.commission_payment_items (
  payment_id uuid not null references public.commission_payments (id) on delete cascade,
  request_id uuid not null references public.service_requests (id) on delete cascade,
  primary key (payment_id, request_id)
);

alter table public.commission_payments enable row level security;
alter table public.commission_payment_items enable row level security;

create policy "Businesses can view their own commission payments"
  on public.commission_payments for select
  using (auth.uid() = business_id);

create policy "Admins can view all commission payments"
  on public.commission_payments for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- Gib Trades — fix chat_messages RLS for multi-listing businesses
-- These two policies still checked service_requests.business_id, which was
-- renamed to listing_id when business_listings was introduced (so it now
-- points at a business_listings.id, not the business's own auth uid). Every
-- business's first/migrated listing was backfilled to reuse the business's
-- own id, so that one listing's threads happened to still pass this check —
-- but any listing created since then has its own random id, so the business
-- could never see or send chat messages on those threads.
drop policy if exists "Participants can view chat messages" on public.chat_messages;
create policy "Participants can view chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.service_requests r
      join public.business_listings l on l.id = r.listing_id
      where r.id = chat_messages.request_id
        and (r.customer_id = auth.uid() or l.business_id = auth.uid())
    )
  );

drop policy if exists "Participants can send chat messages" on public.chat_messages;
create policy "Participants can send chat messages"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.service_requests r
      join public.business_listings l on l.id = r.listing_id
      where r.id = chat_messages.request_id
        and (r.customer_id = auth.uid() or l.business_id = auth.uid())
    )
  );
