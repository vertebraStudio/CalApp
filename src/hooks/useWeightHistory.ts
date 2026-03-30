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
      
      // Upsert: si ya hay un peso hoy, lo actualiza. Si no, lo crea.
      const { data, error } = await supabase
        .from('weight_history')
        .upsert({ 
          user_id: user!.id, 
          weight, 
          recorded_at: today 
        }, { onConflict: 'user_id, recorded_at' })
        .select()
        .single()
      
      if (error) throw error
      return data as WeightHistoryEntry
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-history'] })
    },
  })
}
