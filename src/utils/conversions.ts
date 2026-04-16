import { FriendlyMeasure } from '@/types'

export const MEASURES_BY_CATEGORY: Record<string, FriendlyMeasure[]> = {
  'Bebidas': [
    { name: 'vaso', weight: 250 },
    { name: 'taza', weight: 150 },
    { name: 'lata', weight: 330 },
    { name: 'chorrito', weight: 15 },
  ],
  'Lácteos': [
    { name: 'vaso', weight: 250 },
    { name: 'taza', weight: 150 },
    { name: 'yogur', weight: 125 },
    { name: 'cucharada', weight: 15 },
  ],
  'Frutos Secos': [
    { name: 'puñado', weight: 30 },
    { name: 'cucharada', weight: 15 },
    { name: 'porción', weight: 30 },
  ],
  'Snacks': [
    { name: 'puñado', weight: 30 },
    { name: 'cucharada', weight: 15 },
    { name: 'porción', weight: 30 },
  ],
  'Legumbres': [
    { name: 'taza', weight: 200 },
    { name: 'puñado', weight: 40 },
    { name: 'cucharada', weight: 15 },
  ],
  'Cereales': [
    { name: 'taza', weight: 200 },
    { name: 'puñado', weight: 40 },
    { name: 'cucharada', weight: 15 },
  ],
  'Carne': [
    { name: 'filete', weight: 150 },
  ],
  'Pescado': [
    { name: 'filete', weight: 150 },
  ],
}

const CONTAINER_UNITS = [
  'lata', 'botella', 'brick', 'tercio', 'paquete', 
  'bolsa', 'copa', 'unidad', 'rebanada', 'pieza',
  'tarrina', 'yogur', 'sobre', 'barrita'
]

export function getFriendlyMeasures(
  isLiquid: boolean, 
  customMeasures?: FriendlyMeasure[], 
  servingUnit?: string,
  category?: string
): FriendlyMeasure[] {
  // 1. If custom measures are explicitly provided in DB, use ONLY those
  if (customMeasures && customMeasures.length > 0) {
    return customMeasures
  }

  // 2. If it has a specific unit (servingUnit), suppress generic defaults
  const hasSpecificUnit = servingUnit && CONTAINER_UNITS.includes(servingUnit.toLowerCase())
  if (hasSpecificUnit) {
    return []
  }

  // 3. Category-specific defaults
  if (category && MEASURES_BY_CATEGORY[category]) {
    return MEASURES_BY_CATEGORY[category]
  }

  // 4. Fallback defaults (if no category or category not matched)
  return isLiquid 
    ? MEASURES_BY_CATEGORY['Bebidas'].slice(0, 2) // vaso, taza fallback
    : [] // No generic defaults for Verduras, Carne, Fruta, etc. as per user request
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
    friendly_measures?: FriendlyMeasure[],
    categoria?: string
  }
): number {
  if (unit === 'base') return amount
  if (unit === 'serving') return amount * (foodData.serving_size_g || 100)
  
  const measures = getFriendlyMeasures(
    !!foodData.is_liquid, 
    foodData.friendly_measures, 
    undefined, 
    foodData.categoria
  )
  const measure = measures.find(m => m.name.toLowerCase() === unit.toLowerCase())
  
  if (measure) return amount * measure.weight
  
  // Fallback to base
  return amount
}
