import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { WaterLog } from '@/types'

export function useWater(date: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['water', user?.id, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', date)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
      return data as WaterLog | null
    },
    enabled: !!user && !!date,
  })
}

export function useUpdateWater() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ date, ml }: { date: string; ml: number }) => {
      const { error } = await supabase
        .from('water_logs')
        .upsert({ 
          user_id: user!.id, 
          date, 
          ml_consumed: ml 
        }, { onConflict: 'user_id,date' })
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['water', user?.id, variables.date] })
    },
  })
}
