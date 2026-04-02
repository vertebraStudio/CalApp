-- Migración para añadir la columna categoria a la tabla public.meals
-- Esto permite consistencia entre los alimentos de la comunidad y el diario del usuario

ALTER TABLE public.meals 
ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Opcional: Actualizar registros existentes basados en el nombre si fuera posible, 
-- pero por ahora los dejamos como NULL o una categoría por defecto si se prefiere.
-- UPDATE public.meals SET categoria = 'Otros' WHERE categoria IS NULL;
