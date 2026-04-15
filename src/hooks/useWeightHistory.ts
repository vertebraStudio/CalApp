import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { WeightHistoryEntry } from '@/types'

export function useWeightHistory() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['weight-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .order('recorded_at', { ascending: true })
      if (error) throw error
      return data as WeightHistoryEntry[]
    },
    enabled: !!user,
  })
}

export function useAddWeightEntry() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (weight: number) => {
      const today = new Date().toISOString().slice(0, 10)

      // Check if there's already an entry for today
      const { data: existing } = await supabase
        .from('weight_history')
        .select('id')
        .eq('user_id', user!.id)
        .eq('recorded_at', today)
        .maybeSingle()

      if (existing) {
        // Update existing entry — no .single() to avoid PGRST116 from RLS
        const { error } = await supabase
          .from('weight_history')
          .update({ weight })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('weight_history')
          .insert({ user_id: user!.id, weight, recorded_at: today })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-history'] })
    },
  })
}
