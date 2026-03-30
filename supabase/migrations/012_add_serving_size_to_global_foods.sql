-- Migración: Añadir serving_size_g a global_foods
-- Permite guardar cuánto pesa una "ración" o "unidad" en gramos/ml
alter table public.global_foods 
add column if not exists serving_size_g numeric(7,2);

comment on column public.global_foods.serving_size_g is 'Weight in grams or milliliters of a single serving/unit';
