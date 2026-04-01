import { FriendlyMeasure } from '@/types'

export const DEFAULT_SOLID_MEASURES: FriendlyMeasure[] = [
  { name: 'puñado', weight: 30 },
  { name: 'cucharada', weight: 15 },
]

export const DEFAULT_LIQUID_MEASURES: FriendlyMeasure[] = [
  { name: 'vaso', weight: 250 },
  { name: 'taza', weight: 150 },
  { name: 'chorrito', weight: 15 },
  { name: 'cucharada', weight: 10 },
]

const CONTAINER_UNITS = [
  'lata', 'botella', 'brick', 'tercio', 'paquete', 
  'bolsa', 'copa', 'unidad', 'rebanada', 'pieza',
  'tarrina', 'yogur', 'sobre', 'barrita'
]

export function getFriendlyMeasures(
  isLiquid: boolean, 
  customMeasures?: FriendlyMeasure[], 
  servingUnit?: string
): FriendlyMeasure[] {
  // If custom measures are explicitly provided in DB, use ONLY those (override defaults)
  if (customMeasures && customMeasures.length > 0) {
    return customMeasures
  }

  // If the product has a specific container/unit (e.g., 'lata', 'unidad'), 
  // we suppress generic defaults to avoid noise.
  const hasSpecificUnit = servingUnit && CONTAINER_UNITS.includes(servingUnit.toLowerCase())
  
  if (hasSpecificUnit) {
    return []
  }

  // Otherwise, return global defaults
  return isLiquid ? DEFAULT_LIQUID_MEASURES : DEFAULT_SOLID_MEASURES
}

/**
 * Normalizes any unit to its base weight in grams or milliliters.
 * @param amount Number of units
 * @param unit Unit name (base, serving, or friendly measure name)
 * @param foodData The food object containing base metadata
 */
export function normalizeToWeight(
  amount: number, 
  unit: string, 
  foodData: { 
    is_liquid?: boolean, 
    serving_size_g?: number, 
    friendly_measures?: FriendlyMeasure[] 
  }
): number {
  if (unit === 'base') return amount
  if (unit === 'serving') return amount * (foodData.serving_size_g || 100)
  
  const measures = getFriendlyMeasures(!!foodData.is_liquid, foodData.friendly_measures)
  const measure = measures.find(m => m.name.toLowerCase() === unit.toLowerCase())
  
  if (measure) return amount * measure.weight
  
  // Fallback to base
  return amount
}
