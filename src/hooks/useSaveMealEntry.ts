import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'

export interface MealEntryData {
  food_name: string
  calories: number
  macros: {
    p: number
    c: number
    f: number
    sugar?: number
    salt?: number
  }
  meal_type: 'breakfast' | 'lunch' | 'snack' | 'dinner'
  categoria?: string | null
  image_url?: string | null
  // Base values for precision editing
  base_values?: {
    calories: number
    p: number
    c: number
    f: number
    sugar?: number
    salt?: number
    serving_size_g?: number
    serving_unit?: string
    base_unit?: string
    is_liquid?: boolean
    friendly_measures?: import('@/types').FriendlyMeasure[]
  }
}

export function useSaveMealEntry() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveMeal = async (data: MealEntryData) => {
    if (!user) {
      setError('Debes iniciar sesión para guardar comidas')
      return false
    }

    setIsSaving(true)
    setError(null)

    try {
      const { error: dbError } = await supabase.from('meals').insert([
        {
          user_id: user.id,
          name: data.food_name,
          calories: data.calories,
          protein: data.macros.p,
          carbs: data.macros.c,
          fats: data.macros.f,
          sugar: data.macros.sugar ?? 0,
          salt: data.macros.salt ?? 0,
          meal_type: data.meal_type,
          categoria: data.categoria || null,
          image_url: data.image_url || null,
          // New base values columns
          base_calories: data.base_values?.calories,
          base_protein: data.base_values?.p,
          base_carbs: data.base_values?.c,
          base_fats: data.base_values?.f,
          base_sugar: data.base_values?.sugar,
          base_salt: data.base_values?.salt,
          serving_size_g: data.base_values?.serving_size_g,
          serving_unit: data.base_values?.serving_unit,
          base_unit: data.base_values?.base_unit,
          is_liquid: data.base_values?.is_liquid,
          friendly_measures: data.base_values?.friendly_measures,
        },
      ])

      if (dbError) throw dbError

      // Invalidate existing queries to trigger a refetch on the dashboard
      await queryClient.invalidateQueries({ queryKey: ['meals'] })
      return true
    } catch (err: any) {
      console.error('Error saving meal:', err)
      setError(err.message || 'Error al guardar la comida')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return { saveMeal, isSaving, error }
}
