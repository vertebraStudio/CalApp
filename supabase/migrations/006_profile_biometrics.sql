-- ============================================================
-- NutriSnap — Migración: Datos Biométricos en Profiles
-- ============================================================

alter table public.profiles
  add column if not exists gender text check (gender in ('Masculino', 'Femenino', 'Otro')),
  add column if not exists age int,
  add column if not exists activity_level text check (activity_level in ('Sedentario', 'Ligero', 'Moderado', 'Muy Activo', 'Atleta'));

-- Asegurar que weight y height tengan precisión decimal adecuada si no la tenían
-- (En 001_init.sql eran numeric(5,2), lo cual es correcto para kg y cm)
