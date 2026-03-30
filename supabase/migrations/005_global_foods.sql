-- ============================================================
-- NutriSnap — Migración: Tabla Global de Alimentos
-- Repositorio comunitario de alimentos verificados
-- ============================================================

create extension if not exists pg_trgm;

create table if not exists public.global_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null, -- Para búsquedas insensibles a acentos/case
  brand text,
  category text,
  calories_per_100g numeric(6,2) not null,
  protein_per_100g numeric(6,2) not null,
  carbs_per_100g numeric(6,2) not null,
  fats_per_100g numeric(6,2) not null,
  sugar_per_100g numeric(6,2) default 0,
  salt_per_100g numeric(6,2) default 0,
  verified_by_community boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(normalized_name, brand)
);

-- Índices para búsqueda rápida
create index if not exists global_foods_name_idx on public.global_foods using gin (name gin_trgm_ops);
create index if not exists global_foods_normalized_name_idx on public.global_foods (normalized_name);

-- RLS: Lectura pública, inserción para usuarios autenticados
alter table public.global_foods enable row level security;

create policy "Cualquiera puede leer alimentos globales"
  on public.global_foods for select
  using (true);

create policy "Usuarios autenticados pueden añadir alimentos globales"
  on public.global_foods for insert
  with check (auth.role() = 'authenticated');
