-- Migración: Añadir image_url a global_foods
alter table public.global_foods 
add column if not exists image_url text;
