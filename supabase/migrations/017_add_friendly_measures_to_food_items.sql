-- Migration to add friendly measures and liquid support to global_foods
ALTER TABLE global_foods ADD COLUMN IF NOT EXISTS friendly_measures JSONB DEFAULT '[]'::jsonb;
ALTER TABLE global_foods ADD COLUMN IF NOT EXISTS is_liquid BOOLEAN DEFAULT false;

-- Add comment to explain the structure
COMMENT ON COLUMN global_foods.friendly_measures IS 'Array of objects: [{ "name": "cucharada", "weight": 15 }, { "name": "taza", "weight": 250 }]';

-- Update some common items for testing (Optional but helpful)
-- Note: In a real app, this would be updated via an admin panel or data import
UPDATE global_foods SET is_liquid = true WHERE name ILIKE '%aceite%' OR name ILIKE '%leche%' OR name ILIKE '%agua%' OR name ILIKE '%zumo%';
UPDATE global_foods SET friendly_measures = '[{"name": "cucharada", "weight": 10}, {"name": "chorrito", "weight": 15}]'::jsonb WHERE name ILIKE '%aceite%';
UPDATE global_foods SET friendly_measures = '[{"name": "puñado", "weight": 30}]'::jsonb WHERE name ILIKE '%nueces%' OR name ILIKE '%almendras%';
