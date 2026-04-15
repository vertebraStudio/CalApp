import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useFridge } from '@/hooks/useFridge'
import DirectManualEntry from './DirectManualEntry'
import type { Food } from '@/types'

interface AddToFridgeProps {
  onClose: () => void
}

export default function AddToFridge({ onClose }: AddToFridgeProps) {
  const { addToFridge, isUpdating } = useFridge()
  
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  
  // Inventory specific state
  const [amount, setAmount] = useState<number>(1)
  const [unit] = useState<string>('uds')
  const [expirationDate, setExpirationDate] = useState<string>('')
  const [showManual, setShowManual] = useState(false)

  // Search logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([])
        return
      }
      setIsSearching(true)
      const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      
      const { data, error } = await supabase
        .from('global_foods')
        .select('*')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%,normalized_name.ilike.%${normalizedQuery}%`)
        .limit(10)

      if (!error && data) {
        // Map database field "name" to our local component expected "food_name" if needed, 
        // or just use them as they come. In our Food type, it's food_name, so let's map.
        const mapped = data.map((item: any) => ({
          ...item,
          food_name: item.name,
          brand_name: item.brand
        }))
        setResults(mapped as Food[])
      }
      setIsSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const handleSave = async (foodId: string, foodData: Food) => {
    // Save raw units/amount to fridge. 1 unit = foodData.serving_size_g when logging a meal later.
    const success = await addToFridge(
      foodId,
      amount,
      unit === 'base' ? (foodData.base_unit || 'g') : 'uds',
      expirationDate || null,
      foodData.food_name,
      foodData.image_url
    )

    if (success) onClose()
  }

  const handleManualSuccess = async (newFoodId: string, newFoodData: any) => {
    // When food is created manually, add it to fridge immediately
    await handleSave(newFoodId, newFoodData as Food)
  }

  if (showManual) {
    return (
      <DirectManualEntry 
        onClose={() => setShowManual(false)} 
        onSuccess={handleManualSuccess}
      />
    )
  }

  if (selectedFood) {

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-20 sm:pb-4 animate-fadeIn">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col max-h-[82vh] overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="p-6 border-b border-slate-50 shrink-0 flex items-center justify-between">
            <button onClick={() => setSelectedFood(null)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-[#7B61FF] rounded-2xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center flex-1 mx-4">
              <h3 className="font-black text-slate-800 text-lg leading-tight truncate px-2">{selectedFood.food_name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedFood.brand_name || 'Genérico'}</p>
            </div>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-slate-50 rounded-3xl p-6 space-y-6">
              
              {/* Quantity Selector - Simplified for Units */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col flex-1">
                  <span className="text-[14px] font-black text-slate-800 leading-tight">¿Cuántas unidades?</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Número de envases o piezas 📦</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-2xl shadow-sm border border-slate-200">
                  <button onClick={() => setAmount(prev => Math.max(1, prev - 1))} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:text-[#7B61FF] transition-all active:scale-90">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                  </button>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(Number(e.target.value) || 1)}
                    className="w-12 text-center font-black text-[#7B61FF] text-xl bg-transparent outline-none"
                  />
                  <button onClick={() => setAmount(prev => prev + 1)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:text-[#7B61FF] transition-all active:scale-90">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>

              {/* Expiration Date - Prominent */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-sm">📅</span>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha de Caducidad</label>
                </div>
                <input 
                  type="date" 
                  value={expirationDate}
                  onChange={e => setExpirationDate(e.target.value)}
                  className="w-full bg-white p-4 rounded-2xl font-bold text-slate-600 border border-slate-100 shadow-sm outline-none focus:border-[#7B61FF]/30 transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            <button 
              onClick={() => handleSave(selectedFood.id, selectedFood)} 
              disabled={isUpdating}
              className="w-full bg-[#7B61FF] text-white font-black py-5 rounded-3xl text-lg shadow-xl shadow-purple-200 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {isUpdating ? 'Añadiendo...' : 'Confirmar Stock 🧊'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-20 sm:pb-4 animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col h-[82vh] overflow-hidden animate-slideUp">
        <div className="p-6 border-b border-slate-50 shrink-0 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 text-lg tracking-tight">Buscar Alimento 🧊</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">Añadir a la Nevera</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="relative">
            <input 
              type="text" 
              autoFocus
              placeholder="Buscar por nombre..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-slate-50 p-5 pl-12 rounded-3xl font-bold text-slate-800 border-2 border-transparent focus:border-[#7B61FF]/20 focus:bg-white transition-all outline-none"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {isSearching ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Buscando...</p>
              </div>
            ) : results.length > 0 ? (
              results.map(f => (
                <button 
                  key={f.id} 
                  onClick={() => setSelectedFood(f)}
                  className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group text-left"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl shrink-0 overflow-hidden group-hover:scale-110 transition-transform">
                    {f.image_url ? <img src={f.image_url} alt="" className="w-full h-full object-cover" /> : '🍲'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-800 text-sm truncate">{f.food_name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{f.brand_name || 'Genérico'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-[#5BC897]">{f.calories} kcal</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase">por 100{f.base_unit || 'g'}</p>
                  </div>
                </button>
              ))
            ) : query.length >= 2 ? (
              <div className="py-16 flex flex-col items-center text-center gap-6">
                <div className="text-4xl">🤷🏾‍♂️</div>
                <div>
                  <p className="text-sm font-black text-slate-700">No encontramos ese alimento</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">¿Quieres darlo de alta ahora?</p>
                </div>
                <button 
                  onClick={() => setShowManual(true)}
                  className="bg-[#7B61FF] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-purple-100 active:scale-95"
                >
                  Escáner IA + Alta Manual 📸
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
