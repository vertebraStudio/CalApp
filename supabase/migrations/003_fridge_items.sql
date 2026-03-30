-- ============================================================
-- NutriSnap — Migración: Tabla Mi Nevera (fridge_items)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

create table if not exists public.fridge_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  category     text not null default 'Despensa',
  image_url    text,
  -- Macros por 100g
  calories_per_100g  numeric(7,2) not null default 0,
  protein_per_100g   numeric(6,2) not null default 0,
  carbs_per_100g     numeric(6,2) not null default 0,
  fats_per_100g      numeric(6,2) not null default 0,
  -- Stock
  stock_amount  numeric(8,2) not null default 0,
  stock_unit    text not null default 'g',         -- 'g', 'ml', 'uds'
  low_stock_threshold  numeric(8,2) default 100,   -- Alerta por debajo de este valor
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- RLS
alter table public.fridge_items enable row level security;

create policy "users can view own fridge"
  on public.fridge_items for select using (auth.uid() = user_id);

create policy "users can insert own fridge"
  on public.fridge_items for insert with check (auth.uid() = user_id);

create policy "users can update own fridge"
  on public.fridge_items for update using (auth.uid() = user_id);

create policy "users can delete own fridge"
  on public.fridge_items for delete using (auth.uid() = user_id);

-- Índice
create index if not exists fridge_user_category_idx on public.fridge_items(user_id, category);
