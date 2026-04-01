-- Migration to standardize brand casing to Title Case (Hacendado, Coca Cola)
UPDATE global_foods 
SET brand = INITCAP(LOWER(trim(brand))) 
WHERE brand IS NOT NULL;

-- Remove duplicate global_foods entries (exact same name AND same standardized brand)
-- This keeps only the most recent entry if duplicates exist after normalization
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER(PARTITION BY LOWER(trim(name)), LOWER(trim(brand)) ORDER BY created_at DESC) as rnk
  FROM global_foods
)
DELETE FROM global_foods
WHERE id IN (SELECT id FROM duplicates WHERE rnk > 1);

-- Add comment to record standardization rule
COMMENT ON COLUMN global_foods.brand IS 'Standardized to Title Case (INITCAP). Search logic should use ILIKE for flexibility.';
