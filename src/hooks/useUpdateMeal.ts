import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import type { MealEntryData } from './useSaveMealEntry'

export function useUpdateMeal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateMeal = async (mealId: string, data: MealEntryData) => {
    if (!user) {
      setError('Debes iniciar sesión para editar comidas')
      return false
    }

    setIsUpdating(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('meals')
        .update({
          name: data.food_name,
          calories: data.calories,
          protein: data.macros.p,
          carbs: data.macros.c,
          fats: data.macros.f,
          sugar: data.macros.sugar ?? 0,
          salt: data.macros.salt ?? 0,
          meal_type: data.meal_type,
          image_url: data.image_url || null,
          // Update base values if provided (usually they don't change during edit, 
          // but we include them for completeness or in case they were missing)
          base_calories: data.base_values?.calories,
          base_protein: data.base_values?.p,
          base_carbs: data.base_values?.c,
          base_fats: data.base_values?.f,
          base_sugar: data.base_values?.sugar,
          base_salt: data.base_values?.salt,
          serving_size_g: data.base_values?.serving_size_g,
          serving_unit: data.base_values?.serving_unit,
          base_unit: data.base_values?.base_unit,
        })
        .eq('id', mealId)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      // Invalidate both meals and any planners that might be showing this meal
      await queryClient.invalidateQueries({ queryKey: ['meals'] })
      return true
    } catch (err: any) {
      console.error('Error updating meal:', err)
      setError(err.message || 'Error al actualizar la comida')
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  return { updateMeal, isUpdating, error }
}
