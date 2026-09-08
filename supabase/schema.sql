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

-- Gib Trades — admin chat oversight + human-friendly case numbers
-- Admins already have full read access to service_requests (see "Admins can
-- view all requests"); chat_messages was still participants-only, so admins
-- couldn't see either side of a dispute. Also adds a short sequential case
-- number so a customer/business has something readable to quote to support
-- instead of a UUID.
alter table public.service_requests
  add column if not exists case_number bigint generated always as identity;

create unique index if not exists service_requests_case_number_idx on public.service_requests (case_number);

drop policy if exists "Admins can view all chat messages" on public.chat_messages;
create policy "Admins can view all chat messages"
  on public.chat_messages for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- Gib Trades — indexes for foreign-key lookups
-- Every RLS policy and every app query filters/joins on these columns
-- (auth.uid() = customer_id, request_id = ..., listing_id in (...), etc).
-- Without an index Postgres sequentially scans the whole table to answer
-- them, and every one of those scans also runs once per row as part of RLS
-- policy evaluation. Cheap now, load-bearing once the tables have real rows.
create index if not exists service_requests_customer_id_idx on public.service_requests (customer_id);
create index if not exists service_requests_listing_id_idx on public.service_requests (listing_id);
create index if not exists service_requests_created_at_idx on public.service_requests (created_at desc);

create index if not exists chat_messages_request_id_idx on public.chat_messages (request_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages (request_id, created_at);

create index if not exists reviews_request_id_idx on public.reviews (request_id);
create index if not exists reviews_listing_id_idx on public.reviews (listing_id);
create index if not exists reviews_customer_id_idx on public.reviews (customer_id);

create index if not exists business_listings_business_id_idx on public.business_listings (business_id);

create index if not exists business_gallery_images_listing_id_idx on public.business_gallery_images (listing_id);

create index if not exists business_flags_business_id_idx on public.business_flags (business_id);

create index if not exists commission_payments_business_id_idx on public.commission_payments (business_id);
create index if not exists commission_payment_items_request_id_idx on public.commission_payment_items (request_id);

-- Gib Trades — business-proposed categories
-- Categories themselves still ship with the app (data/categories.ts). This
-- table only covers trades a business asks for that aren't in that list.
-- Approved rows are merged into the category list at runtime and land in the
-- "Other" group, so admin approval publishes a category to every device
-- rather than only the one that approved it — the app previously kept
-- categories in per-device AsyncStorage, where an approval went nowhere.
create table if not exists public.proposed_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  proposed_by uuid references public.businesses (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.proposed_categories enable row level security;

-- Customers need to see approved categories to browse them at all, so the
-- read policy is deliberately open rather than limited to signed-in users.
create policy "Anyone can view approved categories"
  on public.proposed_categories for select
  using (status = 'approved');

create policy "Businesses can view their own proposals"
  on public.proposed_categories for select
  using (auth.uid() = proposed_by);

create policy "Businesses can propose categories"
  on public.proposed_categories for insert
  with check (auth.uid() = proposed_by);

create policy "Admins can view all proposed categories"
  on public.proposed_categories for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create policy "Admins can review proposed categories"
  on public.proposed_categories for update
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create index if not exists proposed_categories_status_idx on public.proposed_categories (status);
create index if not exists proposed_categories_proposed_by_idx on public.proposed_categories (proposed_by);

-- Realtime, so an approval reaches browsing customers without a restart.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'proposed_categories'
  ) then
    alter publication supabase_realtime add table public.proposed_categories;
  end if;
end $$;

-- Gib Trades — admin curation: listing order and category placement
-- Both of these have to live server-side for the same reason proposed
-- categories do: an admin reordering or re-grouping on their own device
-- would otherwise change nothing for anyone else.

-- Higher priority sorts first, ties fall back to rating. Default 0 leaves
-- every existing listing where it was until an admin actually intervenes.
alter table public.business_listings
  add column if not exists display_priority int not null default 0;

create index if not exists business_listings_display_priority_idx
  on public.business_listings (display_priority desc);

-- Admins could read every listing but not touch one, so reordering needs a
-- new policy rather than reusing the business-owns-its-listing rule.
create policy "Admins can update any listing"
  on public.business_listings for update
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- Categories ship inside the app (data/categories.ts). This table records
-- admin changes to them — which group a category sits in, and whether it is
-- live — keyed by the category slug. A null column means "leave as shipped",
-- so a row can override placement without touching status or vice versa.
create table if not exists public.category_overrides (
  slug text primary key,
  group_id text check (group_id in ('home', 'other', 'vehicle', 'events')),
  status text check (status in ('live', 'coming-soon')),
  updated_at timestamptz not null default now()
);

alter table public.category_overrides enable row level security;

-- Customers must see these to browse the categories in the right place, so
-- reads are open rather than restricted to signed-in users.
create policy "Anyone can view category overrides"
  on public.category_overrides for select
  using (true);

create policy "Admins can insert category overrides"
  on public.category_overrides for insert
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

create policy "Admins can update category overrides"
  on public.category_overrides for update
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'category_overrides'
  ) then
    alter publication supabase_realtime add table public.category_overrides;
  end if;
end $$;

-- RockServ — masked customer contact details (commission protection)
-- A business used to receive the customer's full name, phone number and exact
-- address the moment a request landed. That is everything needed to take the
-- job off the platform before RockServ has any record that it happened, and
-- hiding the fields in the app fixes nothing: a business holds a real session
-- token and can query any row RLS lets it read, whatever the app draws.
--
-- So the contact details move out of service_requests into their own table,
-- and that table's RLS only lets the business read a row once the customer has
-- accepted a quote in-app (or booked an instant job, which is an acceptance in
-- itself). Until then the business sees the job description and a general area.
--
-- This cannot stop a business asking for a phone number in chat — nothing can.
-- It closes the easy path and makes the harder one leave a trail.
--
-- NOTE: this drops columns that older builds still insert into. Every device
-- has to be on this build or newer; an older build's request will now fail.
create table if not exists public.service_request_contacts (
  request_id uuid primary key references public.service_requests (id) on delete cascade,
  customer_name text not null,
  phone text not null,
  address text not null,
  created_at timestamptz not null default now()
);

-- area: the general neighbourhood, safe to show before acceptance.
-- customer_display_name: "John S." rather than the full name. Gibraltar is
-- small enough that a full name is close to contact details on its own.
alter table public.service_requests
  add column if not exists area text not null default '',
  add column if not exists customer_display_name text not null default '',
  add column if not exists quote_accepted_at timestamptz;

-- Move existing rows across before the columns go. Guarded on the old columns
-- still existing so re-running this file after the drop is a no-op.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_requests' and column_name = 'phone'
  ) then
    insert into public.service_request_contacts (request_id, customer_name, phone, address)
    select id, customer_name, phone, address from public.service_requests
    on conflict (request_id) do nothing;

    update public.service_requests
      set customer_display_name = split_part(trim(customer_name), ' ', 1)
      where customer_display_name = '';
  end if;
end $$;

alter table public.service_requests
  drop column if exists phone,
  drop column if exists address,
  drop column if exists customer_name;

alter table public.service_request_contacts enable row level security;

create policy "Customers can view their own request contacts"
  on public.service_request_contacts for select
  using (exists (
    select 1 from public.service_requests r
    where r.id = service_request_contacts.request_id and r.customer_id = auth.uid()
  ));

create policy "Customers can attach contacts to their own requests"
  on public.service_request_contacts for insert
  with check (exists (
    select 1 from public.service_requests r
    where r.id = service_request_contacts.request_id and r.customer_id = auth.uid()
  ));

-- The whole point of the table. A business gets nothing back until the
-- customer has accepted a quote, or booked an instant job themselves.
-- Deliberately NOT unlocked by the business accepting the request or marking
-- it complete — either of those would let the business unlock on its own.
create policy "Businesses can view contacts once the customer has accepted"
  on public.service_request_contacts for select
  using (exists (
    select 1
    from public.service_requests r
    join public.business_listings l on l.id = r.listing_id
    where r.id = service_request_contacts.request_id
      and l.business_id = auth.uid()
      and (r.quote_accepted = true or r.type = 'instant')
  ));

create policy "Admins can view all request contacts"
  on public.service_request_contacts for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- No update or delete policy anywhere: once written, a contact row is fixed.

create index if not exists service_requests_quote_accepted_idx
  on public.service_requests (listing_id, quote_accepted);

-- RockServ — stop each side writing the other side's fields
-- "Businesses can update requests addressed to them" grants UPDATE on the
-- whole row, so a business could simply set quote_accepted = true on a request
-- it received and unlock the customer's contact details itself — which would
-- make the whole masking scheme decorative. Column privileges can't fix this:
-- customer and business are the same Postgres role (authenticated), so a GRANT
-- cannot tell them apart. A trigger can, because it sees auth.uid().
--
-- Fields are quietly reverted rather than raising, so a partial update that
-- happens to include a column stays a normal success for the caller.
create or replace function public.enforce_service_request_field_ownership()
returns trigger language plpgsql as $$
declare
  is_customer boolean;
  is_business boolean;
begin
  if exists (select 1 from public.admins a where a.id = auth.uid()) then
    return new;
  end if;

  is_customer := (auth.uid() = old.customer_id);
  is_business := exists (
    select 1 from public.business_listings l
    where l.id = old.listing_id and l.business_id = auth.uid()
  );

  -- Accepting a quote is what unlocks the contact details, so this is the
  -- line that matters most. The area and display name are the customer's to
  -- set too — a business must not be able to rewrite what it was shown.
  if not is_customer then
    new.customer_id := old.customer_id;
    new.quoted_amount := old.quoted_amount;
    new.quote_accepted := old.quote_accepted;
    new.quote_accepted_at := old.quote_accepted_at;
    new.customer_display_name := old.customer_display_name;
    new.area := old.area;
    -- A business may clear a confirmation when it re-completes a job, but
    -- must never be able to confirm on the customer's behalf.
    if new.customer_confirmed and not old.customer_confirmed then
      new.customer_confirmed := old.customer_confirmed;
    end if;
  end if;

  -- The other direction: job value drives commission, so a customer must not
  -- be able to zero it, mark it paid, or close the job off themselves.
  if not is_business then
    new.status := old.status;
    new.job_value := old.job_value;
    new.commission := old.commission;
    new.commission_paid := old.commission_paid;
    new.scheduled_slot := old.scheduled_slot;
  end if;

  return new;
end $$;

drop trigger if exists service_requests_field_ownership on public.service_requests;
create trigger service_requests_field_ownership
  before update on public.service_requests
  for each row execute function public.enforce_service_request_field_ownership();

-- A request always starts unquoted, unaccepted and unpaid, whatever the
-- client sends. Otherwise a customer could insert one pre-accepted and hand
-- over their contact details before the business has quoted anything.
create or replace function public.reset_service_request_progress()
returns trigger language plpgsql as $$
begin
  new.quoted_amount := null;
  new.quote_accepted := false;
  new.quote_accepted_at := null;
  new.customer_confirmed := false;
  new.job_value := null;
  new.commission := null;
  new.commission_paid := false;
  return new;
end $$;

drop trigger if exists service_requests_reset_progress on public.service_requests;
create trigger service_requests_reset_progress
  before insert on public.service_requests
  for each row execute function public.reset_service_request_progress();

-- RockServ — manager and employee accounts
-- Until now one login meant one business. Construction and cleaning firms have
-- staff, so a business account (the "manager") can now invite employees who
-- see only the jobs assigned to them: not other jobs, not each other, not
-- billing, not analytics. That restriction is enforced here rather than by
-- which screens the app draws, for the same reason the contact masking is.
--
-- Seats are granted by hand. A business asks, an admin decides how many (and
-- what to charge, off-platform), so there is no plan tier or price in here.
alter table public.businesses
  add column if not exists employee_seats int not null default 0;

create table if not exists public.employee_access_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  seats_approved int,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.employee_access_requests enable row level security;

create policy "Businesses can view their own access requests"
  on public.employee_access_requests for select
  using (auth.uid() = business_id);

create policy "Businesses can ask for employee access"
  on public.employee_access_requests for insert
  with check (auth.uid() = business_id);

create policy "Admins can view all access requests"
  on public.employee_access_requests for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create policy "Admins can review access requests"
  on public.employee_access_requests for update
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create index if not exists employee_access_requests_status_idx
  on public.employee_access_requests (status, created_at desc);

-- invite_code is what an employee types after signing up. No email is sent —
-- see redeem_employee_invite below for why a code beats an emailed link here.
create table if not exists public.business_employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text not null default '',
  phone text not null default '',
  invite_code text not null unique,
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.business_employees enable row level security;

-- The manager sees and manages their whole team.
create policy "Businesses can view their own employees"
  on public.business_employees for select
  using (auth.uid() = business_id);

create policy "Businesses can invite employees"
  on public.business_employees for insert
  with check (auth.uid() = business_id);

create policy "Businesses can update their own employees"
  on public.business_employees for update
  using (auth.uid() = business_id);

create policy "Businesses can remove their own employees"
  on public.business_employees for delete
  using (auth.uid() = business_id);

-- An employee sees their own row and nothing else — deliberately not the rest
-- of the team, which is why this is user_id and not business_id.
create policy "Employees can view their own record"
  on public.business_employees for select
  using (auth.uid() = user_id);

create policy "Admins can view all employees"
  on public.business_employees for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

create index if not exists business_employees_business_id_idx on public.business_employees (business_id);
create index if not exists business_employees_user_id_idx on public.business_employees (user_id);

-- Seats are checked here, not in the app: a manager holds a real token and
-- could otherwise insert past whatever the admin approved.
create or replace function public.enforce_employee_seat_limit()
returns trigger language plpgsql as $$
declare
  seats int;
  used int;
begin
  select employee_seats into seats from public.businesses where id = new.business_id;
  select count(*) into used from public.business_employees
    where business_id = new.business_id and status <> 'disabled';
  if used >= coalesce(seats, 0) then
    raise exception 'No employee seats left. Ask RockServ to approve more.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists business_employees_seat_limit on public.business_employees;
create trigger business_employees_seat_limit
  before insert on public.business_employees
  for each row execute function public.enforce_employee_seat_limit();

-- Redeeming an invite has to be security definer: the employee has just
-- signed up and cannot yet see any row in business_employees, so they can't
-- look their own invite up to claim it. A code the manager hands over beats
-- an emailed link here — these are staff standing in the same yard, and an
-- emailed link needs mail infrastructure that can silently fail.
create or replace function public.redeem_employee_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  emp public.business_employees;
  seats int;
  used int;
begin
  if auth.uid() is null then
    raise exception 'You need to be signed in to accept an invite.';
  end if;

  select * into emp from public.business_employees
    where upper(invite_code) = upper(btrim(code))
      and status = 'invited'
      and user_id is null;
  if not found then
    raise exception 'That invite code is not valid, or it has already been used.';
  end if;

  select employee_seats into seats from public.businesses where id = emp.business_id;
  select count(*) into used from public.business_employees
    where business_id = emp.business_id and status = 'active';
  if used >= coalesce(seats, 0) then
    raise exception 'This business has used all of its approved employee seats.';
  end if;

  update public.business_employees
    set user_id = auth.uid(), status = 'active', accepted_at = now()
    where id = emp.id;
  return emp.id;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.redeem_employee_invite(text) from public;
    grant execute on function public.redeem_employee_invite(text) to authenticated;
  end if;
end $$;

-- Assignment lives on the request itself: one job goes to one employee.
-- assignment_map_url is a plain Google Maps link the manager can override,
-- so a job can point at a site entrance rather than the billing address.
alter table public.service_requests
  add column if not exists assigned_employee_id uuid references public.business_employees (id) on delete set null,
  add column if not exists assignment_notes text not null default '',
  add column if not exists assignment_map_url text not null default '',
  add column if not exists assigned_at timestamptz,
  add column if not exists employee_done boolean not null default false,
  add column if not exists employee_done_at timestamptz;

create index if not exists service_requests_assigned_employee_idx
  on public.service_requests (assigned_employee_id);

create policy "Employees can view jobs assigned to them"
  on public.service_requests for select
  using (exists (
    select 1 from public.business_employees e
    where e.id = service_requests.assigned_employee_id
      and e.user_id = auth.uid()
      and e.status = 'active'
  ));

create policy "Employees can update jobs assigned to them"
  on public.service_requests for update
  using (exists (
    select 1 from public.business_employees e
    where e.id = service_requests.assigned_employee_id
      and e.user_id = auth.uid()
      and e.status = 'active'
  ));

-- An employee on site needs the address and a number to ring, but only for
-- their own job and only once it has unlocked for the business anyway.
create policy "Employees can view contacts for jobs assigned to them"
  on public.service_request_contacts for select
  using (exists (
    select 1
    from public.service_requests r
    join public.business_employees e on e.id = r.assigned_employee_id
    where r.id = service_request_contacts.request_id
      and e.user_id = auth.uid()
      and e.status = 'active'
      and (r.quote_accepted = true or r.type = 'instant')
  ));

-- Marking a job "Done" is an internal flag between employee and manager. The
-- manager still performs Mark Complete, which is what starts customer
-- confirmation and commission — so employee_done must not touch status.
create or replace function public.enforce_service_request_field_ownership()
returns trigger language plpgsql as $$
declare
  is_customer boolean;
  is_business boolean;
  is_employee boolean;
  wants_done boolean;
begin
  if exists (select 1 from public.admins a where a.id = auth.uid()) then
    return new;
  end if;

  is_customer := (auth.uid() = old.customer_id);
  is_business := exists (
    select 1 from public.business_listings l
    where l.id = old.listing_id and l.business_id = auth.uid()
  );
  is_employee := exists (
    select 1 from public.business_employees e
    where e.id = old.assigned_employee_id and e.user_id = auth.uid() and e.status = 'active'
  );

  -- An employee may move exactly one flag on their own job and nothing else.
  if is_employee and not is_business and not is_customer then
    wants_done := new.employee_done;
    new := old;
    new.employee_done := wants_done;
    new.employee_done_at := case
      when wants_done and not old.employee_done then now()
      when not wants_done then null
      else old.employee_done_at
    end;
    return new;
  end if;

  -- Accepting a quote is what unlocks the contact details, so this is the
  -- line that matters most. The area and display name are the customer's to
  -- set too — a business must not be able to rewrite what it was shown.
  if not is_customer then
    new.customer_id := old.customer_id;
    new.quoted_amount := old.quoted_amount;
    new.quote_accepted := old.quote_accepted;
    new.quote_accepted_at := old.quote_accepted_at;
    new.customer_display_name := old.customer_display_name;
    new.area := old.area;
    -- A business may clear a confirmation when it re-completes a job, but
    -- must never be able to confirm on the customer's behalf.
    if new.customer_confirmed and not old.customer_confirmed then
      new.customer_confirmed := old.customer_confirmed;
    end if;
  end if;

  -- The other direction: job value drives commission, so a customer must not
  -- be able to zero it, mark it paid, or close the job off themselves. Nor
  -- can they hand their own job to someone else's employee.
  if not is_business then
    new.status := old.status;
    new.job_value := old.job_value;
    new.commission := old.commission;
    new.commission_paid := old.commission_paid;
    new.scheduled_slot := old.scheduled_slot;
    new.assigned_employee_id := old.assigned_employee_id;
    new.assignment_notes := old.assignment_notes;
    new.assignment_map_url := old.assignment_map_url;
    new.assigned_at := old.assigned_at;
    new.employee_done := old.employee_done;
    new.employee_done_at := old.employee_done_at;
  end if;

  return new;
end $$;

-- A manager can only assign to their own staff — otherwise a business could
-- point a job at a rival's employee and hand them the customer's details.
create or replace function public.enforce_assignment_is_own_employee()
returns trigger language plpgsql as $$
declare
  owner uuid;
begin
  if new.assigned_employee_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.assigned_employee_id is not distinct from old.assigned_employee_id then
    return new;
  end if;
  select l.business_id into owner
    from public.business_listings l where l.id = new.listing_id;
  if not exists (
    select 1 from public.business_employees e
    where e.id = new.assigned_employee_id and e.business_id = owner and e.status = 'active'
  ) then
    raise exception 'That employee does not work for this business.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists service_requests_assignment_owner on public.service_requests;
create trigger service_requests_assignment_owner
  before insert or update on public.service_requests
  for each row execute function public.enforce_assignment_is_own_employee();

-- RockServ — business calendar
-- The business's whole diary, not just RockServ work: accepted RockServ jobs
-- come from service_requests, and anything else the business is doing goes in
-- calendar_entries. Two sources rather than copying jobs into a second table,
-- so rescheduling a job can't leave a stale duplicate behind.
--
-- Privacy: there is deliberately NO admin select policy on calendar_entries.
-- We have no business reading who else a plumber works for. Admins only ever
-- see how many hours are blocked out, through admin_busy_summary below —
-- which is the leakage signal anyway. A row-level policy could not do this,
-- since RLS grants whole rows and the titles are the sensitive part.
alter table public.service_requests
  add column if not exists scheduled_for timestamptz;

create index if not exists service_requests_scheduled_for_idx
  on public.service_requests (listing_id, scheduled_for);

create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null default '',
  notes text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint calendar_entries_ends_after_start check (ends_at > starts_at)
);

alter table public.calendar_entries enable row level security;

create policy "Businesses can view their own calendar"
  on public.calendar_entries for select
  using (auth.uid() = business_id);

create policy "Businesses can add to their own calendar"
  on public.calendar_entries for insert
  with check (auth.uid() = business_id);

create policy "Businesses can update their own calendar"
  on public.calendar_entries for update
  using (auth.uid() = business_id);

create policy "Businesses can delete from their own calendar"
  on public.calendar_entries for delete
  using (auth.uid() = business_id);

create index if not exists calendar_entries_business_starts_idx
  on public.calendar_entries (business_id, starts_at);

-- Hours blocked out against RockServ jobs actually completed. A business that
-- is always busy but rarely logs a completion is worth a call. It proves
-- nothing on its own — plenty of trades have private work that has nothing to
-- do with us — which is why this returns counts and not diary entries.
create or replace function public.admin_busy_summary(window_days int default 90)
returns table (business_id uuid, busy_hours numeric, entry_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins a where a.id = auth.uid()) then
    raise exception 'Admins only.';
  end if;
  return query
    select c.business_id,
           round(sum(extract(epoch from (c.ends_at - c.starts_at)) / 3600.0)::numeric, 1) as busy_hours,
           count(*) as entry_count
      from public.calendar_entries c
     where c.starts_at >= now() - make_interval(days => window_days)
     group by c.business_id;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.admin_busy_summary(int) from public;
    grant execute on function public.admin_busy_summary(int) to authenticated;
  end if;
end $$;

-- scheduled_for belongs to whoever runs the job, same as the other job-state
-- columns, so it is locked away from the customer alongside them.
create or replace function public.enforce_service_request_field_ownership()
returns trigger language plpgsql as $$
declare
  is_customer boolean;
  is_business boolean;
  is_employee boolean;
  wants_done boolean;
begin
  if exists (select 1 from public.admins a where a.id = auth.uid()) then
    return new;
  end if;

  is_customer := (auth.uid() = old.customer_id);
  is_business := exists (
    select 1 from public.business_listings l
    where l.id = old.listing_id and l.business_id = auth.uid()
  );
  is_employee := exists (
    select 1 from public.business_employees e
    where e.id = old.assigned_employee_id and e.user_id = auth.uid() and e.status = 'active'
  );

  -- An employee may move exactly one flag on their own job and nothing else.
  if is_employee and not is_business and not is_customer then
    wants_done := new.employee_done;
    new := old;
    new.employee_done := wants_done;
    new.employee_done_at := case
      when wants_done and not old.employee_done then now()
      when not wants_done then null
      else old.employee_done_at
    end;
    return new;
  end if;

  -- Accepting a quote is what unlocks the contact details, so this is the
  -- line that matters most. The area and display name are the customer's to
  -- set too — a business must not be able to rewrite what it was shown.
  if not is_customer then
    new.customer_id := old.customer_id;
    new.quoted_amount := old.quoted_amount;
    new.quote_accepted := old.quote_accepted;
    new.quote_accepted_at := old.quote_accepted_at;
    new.customer_display_name := old.customer_display_name;
    new.area := old.area;
    -- A business may clear a confirmation when it re-completes a job, but
    -- must never be able to confirm on the customer's behalf.
    if new.customer_confirmed and not old.customer_confirmed then
      new.customer_confirmed := old.customer_confirmed;
    end if;
  end if;

  -- The other direction: job value drives commission, so a customer must not
  -- be able to zero it, mark it paid, or close the job off themselves. Nor
  -- can they hand their own job to someone else's employee, or move it in the
  -- business's diary.
  if not is_business then
    new.status := old.status;
    new.job_value := old.job_value;
    new.commission := old.commission;
    new.commission_paid := old.commission_paid;
    new.scheduled_slot := old.scheduled_slot;
    new.scheduled_for := old.scheduled_for;
    new.assigned_employee_id := old.assigned_employee_id;
    new.assignment_notes := old.assignment_notes;
    new.assignment_map_url := old.assignment_map_url;
    new.assigned_at := old.assigned_at;
    new.employee_done := old.employee_done;
    new.employee_done_at := old.employee_done_at;
  end if;

  return new;
end $$;

-- RockServ — live chat
-- A message only appeared after closing and reopening the thread, because the
-- app read the list once on open and never heard about anything after that.
-- Postgres only broadcasts changes for tables in the realtime publication, so
-- the subscription in the app is inert until these two are added.
--
-- service_requests is here as well as chat_messages: accepting a quote changes
-- the request rather than sending a message, and both sides need to see that
-- land — the customer's "Accepted" pill, and the business's contact details
-- unlocking.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'service_requests'
  ) then
    alter publication supabase_realtime add table public.service_requests;
  end if;
end $$;

-- RockServ — keep contact details out of chat
-- Masking the customer's phone number until a quote is accepted achieves
-- nothing if either side can simply type it into the chat, so messages that
-- carry a number or a handle are rejected outright.
--
-- In the database rather than the app, for the usual reason: both parties hold
-- a real session token and can post to the API without going near our screen.
-- The app runs the same check first so the sender gets a civil explanation
-- instead of an error.
--
-- Deliberately narrow. It catches the obvious ("call me on 54001234",
-- "whatsapp me") and will not catch someone spelling a number out in words.
-- The point is to stop the casual route, not to win an arms race.
create or replace function public.looks_like_contact_details(body text)
returns boolean
language plpgsql
immutable
as $$
declare
  run text;
  digits text;
begin
  if body is null then
    return false;
  end if;

  -- Email addresses.
  if body ~* '[[:alnum:]._%%+-]+@[[:alnum:].-]+\.[a-z]{2,}' then
    return true;
  end if;

  -- Messaging apps and social handles, including "@someone".
  if body ~* '(whats\s*app|wapp|telegram|t\.me|wa\.me|signal|snapchat|instagram|insta\b|messenger|facebook|@[[:alnum:]._]{3,})' then
    return true;
  end if;

  -- Any run of digits and separators holding seven or more digits. Seven is
  -- the length of a local Gibraltar number, and it clears ordinary prices,
  -- measurements and dates: "1250", "3000 x 600mm" and "26/08" all stay.
  for run in select (regexp_matches(body, '[0-9][0-9[:space:]()+.-]{4,}[0-9]', 'g'))[1] loop
    digits := regexp_replace(run, '[^0-9]', '', 'g');
    if length(digits) >= 7 then
      return true;
    end if;
  end loop;

  return false;
end $$;

create or replace function public.reject_contact_details_in_chat()
returns trigger language plpgsql as $$
begin
  if new.kind = 'text' and public.looks_like_contact_details(new.text) then
    raise exception 'Phone numbers and contact handles cannot be sent in RockServ chat.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists chat_messages_no_contact_details on public.chat_messages;
create trigger chat_messages_no_contact_details
  before insert or update on public.chat_messages
  for each row execute function public.reject_contact_details_in_chat();

-- RockServ — booking preferences
-- preferred_for is the customer's requested slot as a real timestamp. The
-- existing preferred_date is a display label with no year in it, so it could
-- never be turned back into a date the business could confirm in one tap.
alter table public.service_requests
  add column if not exists preferred_for timestamptz;

-- Live-slot booking is off unless a business asks for it. Most trades price a
-- job before committing to a time; fixed-length work like cleaning does not.
alter table public.business_listings
  add column if not exists live_booking_enabled boolean not null default false;
