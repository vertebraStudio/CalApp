-- Añadir columnas de valores base para permitir edición precisa (gramos/porciones)
ALTER TABLE public.meals 
ADD COLUMN IF NOT EXISTS base_calories double precision,
ADD COLUMN IF NOT EXISTS base_protein double precision,
ADD COLUMN IF NOT EXISTS base_carbs double precision,
ADD COLUMN IF NOT EXISTS base_fats double precision,
ADD COLUMN IF NOT EXISTS base_sugar double precision,
ADD COLUMN IF NOT EXISTS base_salt double precision,
ADD COLUMN IF NOT EXISTS serving_size_g double precision,
ADD COLUMN IF NOT EXISTS serving_unit text,
ADD COLUMN IF NOT EXISTS base_unit text DEFAULT 'g';

-- Comentario explicativo
COMMENT ON COLUMN public.meals.base_calories IS 'Calorías por 100g o unidad base del producto original';
