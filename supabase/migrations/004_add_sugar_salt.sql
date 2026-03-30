-- ============================================================
-- NutriSnap — Migración: Añadir sugar y salt a meals
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

alter table public.meals
  add column if not exists sugar numeric(6,2) not null default 0,
  add column if not exists salt  numeric(6,2) not null default 0;
