-- Migration to link fridge_items to global_foods and add expiration tracking
ALTER TABLE public.fridge_items 
ADD COLUMN IF NOT EXISTS food_id uuid REFERENCES public.global_foods(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS expiration_date timestamptz;

-- Removing redundant macro columns as they should be fetched from global_foods via food_id
-- Note: We keep "name" and "image_url" as a fast cache for the UI, 
-- but macros should be dynamic to reflect global food updates.
ALTER TABLE public.fridge_items
DROP COLUMN IF EXISTS calories_per_100g,
DROP COLUMN IF EXISTS protein_per_100g,
DROP COLUMN IF EXISTS carbs_per_100g,
DROP COLUMN IF EXISTS fats_per_100g;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS fridge_food_idx ON public.fridge_items(food_id);
CREATE INDEX IF NOT EXISTS fridge_expiration_idx ON public.fridge_items(expiration_date);

COMMENT ON TABLE public.fridge_items IS 'User personalized inventory, linked to global_foods for nutritional data.';
