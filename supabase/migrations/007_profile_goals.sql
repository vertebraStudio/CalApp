-- ============================================================
-- NutriSnap — Migración: Objetivos e Intensidad en Profiles
-- ============================================================

alter table public.profiles
  add column if not exists goal_type text check (goal_type in ('Perder Grasa', 'Mantener Peso', 'Ganar Músculo')),
  add column if not exists goal_intensity text check (goal_intensity in ('Estándar', 'Moderado', 'Agresivo')) default 'Moderado';
