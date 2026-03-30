import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { PlannerEntry, MealType } from '@/types'

export function usePlanner(date: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['planner', user?.id, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner')
        .select('*, meal:meals(*)')
        .eq('user_id', user!.id)
        .eq('date', date)
        .order('meal_type')
      if (error) throw error
      return data as PlannerEntry[]
    },
    enabled: !!user,
  })
}

export function useAddToPlanner() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ mealId, date, mealType }: { mealId: string; date: string; mealType: MealType }) => {
      const { error } = await supabase.from('planner').insert({
        user_id: user!.id,
        meal_id: mealId,
        date,
        meal_type: mealType,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
  })
}

export function useRemoveFromPlanner() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('planner').delete().eq('id', entryId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
  })
}
