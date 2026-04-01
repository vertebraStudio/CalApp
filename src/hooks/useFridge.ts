import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import type { FridgeItem } from '@/types'

export function useFridge() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch fridge items with food data
  const getFridgeItems = async () => {
    if (!user) return []
    const { data, error: dbError } = await supabase
      .from('fridge_items')
      .select('*, food:global_foods(*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (dbError) {
      console.error('Error fetching fridge:', dbError)
      return []
    }
    return data as FridgeItem[]
  }

  // Add a piece of food to the fridge
  const addToFridge = async (
    foodId: string, 
    amount: number, 
    unit: string, 
    expirationDate: string | null = null,
    name: string,
    imageUrl: string | null = null
  ) => {
    if (!user) return false
    setIsUpdating(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('fridge_items')
        .insert([{
          user_id: user.id,
          food_id: foodId,
          name: name,
          image_url: imageUrl,
          stock_amount: amount,
          stock_unit: unit,
          expiration_date: expirationDate
        }])

      if (dbError) throw dbError
      
      await queryClient.invalidateQueries({ queryKey: ['fridge'] })
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  // Update existing inventory stock
  const updateStock = async (id: string, newAmount: number) => {
    setIsUpdating(true)
    try {
      const { error: dbError } = await supabase
        .from('fridge_items')
        .update({ stock_amount: newAmount, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (dbError) throw dbError
      
      await queryClient.invalidateQueries({ queryKey: ['fridge'] })
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  // Remove item from fridge
  const removeItem = async (id: string) => {
    setIsUpdating(true)
    try {
      const { error: dbError } = await supabase
        .from('fridge_items')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError
      
      await queryClient.invalidateQueries({ queryKey: ['fridge'] })
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  return { 
    getFridgeItems, 
    addToFridge, 
    updateStock, 
    removeItem, 
    isUpdating, 
    error 
  }
}
