-- Migración para añadir categorías de comida (meal_type)
-- Ejecutar en el SQL Editor de Supabase o vía CLI

-- 1. Añadir la columna meal_type a la tabla public.meals
-- Definimos valores por defecto para las comidas existentes basado en la hora si es posible,
-- pero por ahora lo pondremos como 'snack' (merienda) por defecto.
ALTER TABLE public.meals 
ADD COLUMN IF NOT EXISTS meal_type TEXT DEFAULT 'snack' 
CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner'));

-- 2. (Opcional) Intentar categorizar comidas existentes por hora
-- Desayuno: 05:00 - 11:00
-- Comida: 11:00 - 16:00
-- Merienda: 16:00 - 19:30
-- Cena: 19:30 - 05:00
UPDATE public.meals
SET meal_type = CASE 
    WHEN EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') BETWEEN 5 AND 10 THEN 'breakfast'
    WHEN EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') BETWEEN 11 AND 15 THEN 'lunch'
    WHEN EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') BETWEEN 16 AND 18 THEN 'snack'
    ELSE 'dinner'
END
WHERE meal_type = 'snack'; -- Solo actualizamos las que acabamos de crear con el default

-- 3. Asegurar que la columna es NOT NULL después del update
ALTER TABLE public.meals ALTER COLUMN meal_type SET NOT NULL;
