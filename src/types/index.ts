// Tipos compartidos de la aplicación Gordito

export interface Profile {
  id: string
  username: string
  goal_calories: number
  weight: number | null
  height: number | null
  gender?: 'Masculino' | 'Femenino' | 'Otro'
  age?: number
  activity_level?: 'Sedentario' | 'Ligero' | 'Moderado' | 'Muy Activo' | 'Atleta'
  goal_type?: 'Perder Grasa' | 'Mantener Peso' | 'Ganar Músculo'
  goal_intensity?: 'Estándar' | 'Moderado' | 'Agresivo'
  macro_p_pct?: number
  macro_c_pct?: number
  macro_f_pct?: number
  water_goal_liters: number
}

export interface WaterLog {
  user_id: string
  date: string
  ml_consumed: number
}

export interface Macros {
  p: number  // proteínas (g)
  c: number  // carbohidratos (g)
  f: number  // grasas (g)
}

export interface Meal {
  id: string
  user_id: string
  image_url: string | null
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
  sugar: number
  salt: number
  meal_type: MealType
  created_at: string
  // Base values for precision editing
  base_calories?: number
  base_protein?: number
  base_carbs?: number
  base_fats?: number
  base_sugar?: number
  base_salt?: number
  serving_size_g?: number
  serving_unit?: string
  base_unit?: string
  friendly_measures?: FriendlyMeasure[]
  is_liquid?: boolean
}

export interface FriendlyMeasure {
  name: string
  weight: number
}

export interface PlannerEntry {
  id: string
  user_id: string
  meal_id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'snack' | 'dinner'
  meal?: Meal
}

export type MealType = PlannerEntry['meal_type']

export interface AIAnalysis {
  food_name: string
  calories: number
  macros: Macros
  confidence: number
}

export interface FatSecretFood {
  food_id: string
  food_name: string
  brand_name: string | null
  description: string
  params_per_100g: {
    calories: number
    macros: Macros
  }
}

export interface WeightHistoryEntry {
  id: string
  user_id: string
  weight: number
  recorded_at: string
  created_at: string
}

export type FoodCategory = 
  | 'Verduras' | 'Frutas' | 'Snacks' | 'Carne' | 'Pescado' | 'Cereales' 
  | 'Frutos Secos' | 'Lácteos' | 'Legumbres' | 'Bebidas' | 'Platos Preparados' 
  | 'Congelados' | 'Panadería';

export interface Food {
  id: string
  food_name: string
  brand_name: string | null
  categoria: FoodCategory
  calories: number
  protein: number
  carbs: number
  fats: number
  sugar: number
  salt: number
  image_url: string | null
  serving_size_g: number | null
  serving_unit: string | null
  base_unit: string
  is_liquid: boolean
  friendly_measures: FriendlyMeasure[] | null
  is_global: boolean
  created_at: string
}

export interface FridgeItem {
  id: string
  user_id: string
  food_id: string
  name: string
  image_url: string | null
  stock_amount: number
  stock_unit: string
  expiration_date: string | null
  created_at: string
  updated_at: string
  food?: Food | null
}
