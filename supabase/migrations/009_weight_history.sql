-- ============================================================
-- NutriSnap — Migración: Historial de Peso
-- ============================================================

create table if not exists public.weight_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  weight      numeric(5,2) not null,
  recorded_at date not null default current_date,
  created_at  timestamptz default now()
);

-- RLS
alter table public.weight_history enable row level security;

create policy "users can view own weight history"
  on public.weight_history for select using (auth.uid() = user_id);

create policy "users can insert own weight history"
  on public.weight_history for insert with check (auth.uid() = user_id);

create policy "users can delete own weight history"
  on public.weight_history for delete using (auth.uid() = user_id);

-- Índice para consultas por fecha
create index if not exists weight_history_user_date_idx on public.weight_history(user_id, recorded_at desc);

-- Pre-poblar con el peso actual si existe (Opcional, se hará desde la app mejor)
