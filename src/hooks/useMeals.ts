import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Meal } from '@/types'

export function useMeals(date?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['meals', user?.id, date],
    queryFn: async () => {
      let query = supabase
        .from('meals')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (date) {
        const start = `${date}T00:00:00.000Z`
        const end = `${date}T23:59:59.999Z`
        query = query.gte('created_at', start).lte('created_at', end)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Meal[]
    },
    enabled: !!user,
  })
}

export function useDeleteMeal() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from('meals').delete().eq('id', mealId).eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals'] })
    },
  })
}
