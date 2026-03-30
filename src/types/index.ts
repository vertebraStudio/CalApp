// Tipos compartidos de la aplicación NutriSnap

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
