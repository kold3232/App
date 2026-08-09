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
