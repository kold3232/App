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
-- Any signed-up business is immediately listed (is_approved defaults to
-- true) — admin approval doesn't gate real visibility yet, that's still a
-- local/mock flow on top of this.

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
