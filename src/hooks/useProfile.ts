import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Profile } from '@/types'

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Return skeleton profile for new users
          return {
            id: user!.id,
            username: user!.email?.split('@')[0] || 'Gordito',
            goal_calories: 2000,
            weight: null,
            height: null,
            water_goal_liters: 2.0
          } as Profile
        }
        throw error
      }
      return data as Profile
    },
    enabled: !!user,
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, 'id'>>) => {
      // Try update first (profile should exist for authenticated users)
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)
        .select()
        .single()

      if (error) {
        // If update fails (no rows), try insert
        if (error.code === 'PGRST116') {
          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert({ id: user!.id, ...updates })
            .select()
            .single()
          if (insertError) throw insertError
          return inserted as Profile
        }
        throw error
      }
      return data as Profile
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
