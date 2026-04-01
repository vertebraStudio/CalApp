-- ============================================================
-- NutriSnap — Migración: Categorías Obligatorias de Alimentos
-- ============================================================

-- Renombrar columna de inglés a español
ALTER TABLE public.global_foods RENAME COLUMN category TO categoria;

-- Asignar una categoría por defecto a registros existentes para evitar errores de NOT NULL
-- (El usuario puede cambiar estas categorías manualmente después)
UPDATE public.global_foods SET categoria = 'Snacks' WHERE categoria IS NULL;

-- Hacer que el campo sea obligatorio
ALTER TABLE public.global_foods ALTER COLUMN categoria SET NOT NULL;

-- Restringir los valores permitidos según la lista proporcionada por el usuario
ALTER TABLE public.global_foods ADD CONSTRAINT global_foods_categoria_check 
  CHECK (categoria IN (
    'Verduras', 
    'Frutas', 
    'Snacks', 
    'Carne', 
    'Pescado', 
    'Cereales', 
    'Frutos Secos', 
    'Lácteos', 
    'Legumbres', 
    'Bebidas', 
    'Platos Preparados', 
    'Congelados', 
    'Panadería'
  ));

-- Comentario para documentación
COMMENT ON COLUMN public.global_foods.categoria IS 'Categoría obligatoria del alimento. Ver constraint global_foods_categoria_check para valores permitidos.';
