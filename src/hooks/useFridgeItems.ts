// useFridgeItems — Supabase hook for fridge_items table
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface FridgeItem {
  id: string
  user_id: string
  name: string
  category: string
  image_url: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fats_per_100g: number
  stock_amount: number
  stock_unit: string
  low_stock_threshold: number
  created_at: string
}

export const FRIDGE_CATEGORIES = [
  'Proteínas',
  'Lácteos',
  'Vegetales',
  'Frutas',
  'Cereales',
  'Despensa',
  'Bebidas',
  'Otros',
]

export function useFridgeItems() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['fridge', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('fridge_items')
        .select('*')
        .eq('user_id', user.id)
        .order('category')
        .order('name')
      if (error) throw error
      return data as FridgeItem[]
    },
    enabled: !!user,
  })

  const addItem = useMutation({
    mutationFn: async (item: Omit<FridgeItem, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('No user')
      const { error } = await supabase
        .from('fridge_items')
        .insert({ ...item, user_id: user.id })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fridge'] }),
  })

  const updateStock = useMutation({
    mutationFn: async ({ id, stock_amount }: { id: string; stock_amount: number }) => {
      const { error } = await supabase
        .from('fridge_items')
        .update({ stock_amount, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fridge'] }),
  })

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fridge_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fridge'] }),
  })

  return { items, isLoading, addItem, updateStock, deleteItem }
}
