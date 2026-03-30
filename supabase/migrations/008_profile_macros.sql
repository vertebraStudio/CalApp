-- ============================================================
-- NutriSnap — Migración: Ratios de Macronutrientes
-- ============================================================

alter table public.profiles
  add column if not exists macro_p_pct int default 30,
  add column if not exists macro_c_pct int default 40,
  add column if not exists macro_f_pct int default 30;
