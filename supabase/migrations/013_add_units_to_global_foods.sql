-- Migración: Añadir serving_unit y base_unit a global_foods
-- Permite guardar si la ración es una "unidad", "lata", "vaso", y si la base es "g" o "ml"
alter table public.global_foods 
add column if not exists serving_unit text,
add column if not exists base_unit text default 'g';

comment on column public.global_foods.serving_unit is 'The friendly name of the serving (e.g., unidad, lata, vaso, ración)';
comment on column public.global_foods.base_unit is 'The base measurement unit (g or ml)';
