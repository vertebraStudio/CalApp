-- ============================================================
-- NutriSnap — Migración inicial de base de datos
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Tabla de perfiles de usuario
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text,
  goal_calories int not null default 2000,
  weight      numeric(5,2),
  height      numeric(5,2),
  updated_at  timestamptz default now()
);

-- 2. Tabla de comidas registradas
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  image_url   text,
  name        text not null,
  calories    int not null default 0,
  protein     numeric(6,2) not null default 0,
  carbs       numeric(6,2) not null default 0,
  fats        numeric(6,2) not null default 0,
  created_at  timestamptz default now()
);

-- 3. Tabla del planificador semanal
create table if not exists public.planner (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  meal_id     uuid not null references public.meals(id) on delete cascade,
  date        date not null,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner')),
  created_at  timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.meals    enable row level security;
alter table public.planner  enable row level security;

-- Políticas profiles
create policy "users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "users can upsert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Políticas meals
create policy "users can view own meals"
  on public.meals for select using (auth.uid() = user_id);
create policy "users can insert own meals"
  on public.meals for insert with check (auth.uid() = user_id);
create policy "users can delete own meals"
  on public.meals for delete using (auth.uid() = user_id);

-- Políticas planner
create policy "users can view own planner"
  on public.planner for select using (auth.uid() = user_id);
create policy "users can insert planner entries"
  on public.planner for insert with check (auth.uid() = user_id);
create policy "users can delete planner entries"
  on public.planner for delete using (auth.uid() = user_id);

-- ============================================================
-- Índices para performance
-- ============================================================
create index if not exists meals_user_created_idx on public.meals(user_id, created_at desc);
create index if not exists planner_user_date_idx  on public.planner(user_id, date);
