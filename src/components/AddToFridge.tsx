import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useFridge } from '@/hooks/useFridge'
import DirectManualEntry from './DirectManualEntry'
import type { Food } from '@/types'

const CATEGORIES = [
  { id: 'Verduras', icon: '🥦' },
  { id: 'Frutas', icon: '🍎' },
  { id: 'Snacks', icon: '🍕' },
  { id: 'Carne', icon: '🥩' },
  { id: 'Pescado', icon: '🐟' },
  { id: 'Cereales', icon: '🌾' },
  { id: 'Frutos Secos', icon: '🥜' },
  { id: 'Lácteos', icon: '🥛' },
  { id: 'Legumbres', icon: '🫘' },
  { id: 'Bebidas', icon: '🥤' },
  { id: 'Platos Preparados', icon: '🥘' },
  { id: 'Congelados', icon: '🧊' },
  { id: 'Panadería', icon: '🥖' },
]

interface AddToFridgeProps {
  onClose: () => void
}

export default function AddToFridge({ onClose }: AddToFridgeProps) {
  const { addToFridge, isUpdating } = useFridge()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [brandQuery, setBrandQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [brands, setBrands] = useState<string[]>([])

  // Inventory specific state
  const [amount, setAmount] = useState<number>(1)
  const [unit, setUnit] = useState<string>('uds')
  const [expirationDate, setExpirationDate] = useState<string>('')
  const [showManual, setShowManual] = useState(false)

  // Gesture state
  const [isClosing, setIsClosing] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const DRAG_THRESHOLD = 150

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const currentY = e.touches[0].clientY
    const deltaY = currentY - touchStartY.current
    if (deltaY > 0) setDragOffset(deltaY)
  }

  const handleTouchEnd = () => {
    if (dragOffset > DRAG_THRESHOLD) {
      setIsClosing(true)
      setDragOffset(window.innerHeight)
      setTimeout(onClose, 300)
    } else {
      setDragOffset(0)
    }
    setIsDragging(false)
    touchStartY.current = null
  }

  const dragStyles = {
    transform: `translateY(${dragOffset}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }

  const overlayStyles = {
    opacity: isClosing ? 0 : Math.max(0, 1 - (dragOffset / 300)),
    transition: isDragging ? 'none' : 'opacity 0.3s ease-out',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(2px)'
  }

  const DragHandle = () => (
    <div className="w-full flex justify-center pt-3 pb-1">
      <div className="w-12 h-1.5 bg-black/10 rounded-full pointer-events-none" />
    </div>
  )

  const handleClose = () => {
    setIsClosing(true)
    setDragOffset(window.innerHeight)
    setTimeout(onClose, 300)
  }

  // Fetch unique brands on mount
  useEffect(() => {
    async function loadBrands() {
      const { data, error } = await supabase
        .from('global_foods')
        .select('brand')
        .not('brand', 'is', null)
        .order('brand')

      if (!error && data) {
        const normalized = data.map(item => {
          const b = (item.brand || '').trim().toLowerCase()
          if (!b) return null
          return b.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        }).filter(Boolean) as string[]

        const uniqueBrands = Array.from(new Set(normalized)).sort()
        setBrands(uniqueBrands)
      }
    }
    loadBrands()
  }, [])

  // Search logic
  useEffect(() => {
    if (!query.trim() && !brandQuery.trim() && !selectedCategory) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        
        let supabaseQuery = supabase.from('global_foods').select('*')

        if (query && brandQuery) {
          supabaseQuery = supabaseQuery.ilike('name', `%${query}%`).ilike('brand', `%${brandQuery}%`)
        } else if (query) {
          supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%,normalized_name.ilike.%${normalizedQuery}%`)
        } else if (brandQuery) {
          supabaseQuery = supabaseQuery.ilike('brand', `%${brandQuery}%`)
        }

        if (selectedCategory) {
          supabaseQuery = supabaseQuery.eq('categoria', selectedCategory)
        }

        const { data, error } = await supabaseQuery.limit(15)

        if (!error && data) {
          const mapped = data.map((item: any) => ({
            ...item,
            food_name: item.name,
            brand_name: item.brand
          }))
          setResults(mapped as Food[])
        }
      } catch (err) {
        console.error("Error searching food for fridge:", err)
      } finally {
        setIsSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [query, brandQuery, selectedCategory])

  const handleSave = async (foodId: string, foodData: Food) => {
    const success = await addToFridge(
      foodId,
      amount,
      unit,
      expirationDate || null,
      foodData.food_name,
      foodData.image_url
    )
    if (success) onClose()
  }

  const handleManualSuccess = async (_newFoodId: string, newFoodData: any) => {
    await handleSave(_newFoodId, newFoodData as Food)
  }

  if (showManual) {
    return (
      <DirectManualEntry
        onClose={() => setShowManual(false)}
        onSuccess={handleManualSuccess}
      />
    )
  }

  // --- Detail view: quantity + expiration ---
  if (selectedFood) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        <div
          className="absolute inset-0 animate-fadeIn"
          style={overlayStyles}
          onClick={handleClose}
        />
        <div
          className={`bg-[#FFF156] rounded-t-[3rem] border-t-4 border-black w-full max-w-md shadow-2xl flex flex-col h-[95vh] overflow-hidden relative ${isClosing ? '' : 'animate-slideUp'}`}
          style={dragStyles}
        >
          {/* Drag handle + Header */}
          <div
            className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <DragHandle />
            <div className="p-6 pt-2 flex items-center gap-4">
              <button
                onClick={() => setSelectedFood(null)}
                className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-800 text-lg leading-tight truncate">
                  {selectedFood.food_name}
                </h3>
                <p className="text-[10px] font-bold text-slate-800/40 uppercase tracking-widest mt-0.5">
                  {selectedFood.brand_name || 'Genérico'}
                </p>
              </div>
            </div>
            <div className="h-0.5 bg-black/5 mx-6" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* Quantity */}
            <div className="bg-white rounded-[32px] p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="flex items-center justify-between gap-6 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    ¿Cuántas unidades?
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value) || 1)}
                    className="text-5xl font-black text-black bg-transparent outline-none w-24"
                  />
                  <span className="text-xs font-bold text-[#7B61FF] uppercase tracking-widest mt-1">
                    envases / piezas 📦
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAmount(prev => prev + 1)}
                    className="w-11 h-11 flex items-center justify-center bg-white text-[#7B61FF] rounded-xl transition-all active:scale-95 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v12m6-6H6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setAmount(prev => Math.max(1, prev - 1))}
                    className="w-11 h-11 flex items-center justify-center bg-white text-slate-400 rounded-xl transition-all active:scale-95 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 12H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Expiration Date */}
            <div className="bg-white rounded-[24px] p-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Fecha de Caducidad
                </label>
              </div>
              <input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-600 border-2 border-black focus:border-[#7B61FF] outline-none transition-all cursor-pointer appearance-none box-border"
              />
            </div>
          </div>

          {/* Confirm Button */}
          <div className="p-6 pt-2">
            <button
              onClick={() => handleSave(selectedFood.id, selectedFood)}
              disabled={isUpdating}
              className="w-full bg-[#7B61FF] text-white border-2 border-black rounded-[32px] py-5 text-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50"
            >
              {isUpdating ? 'Añadiendo...' : 'Confirmar Stock 🧊'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Search view ---
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fadeIn"
        style={overlayStyles}
        onClick={handleClose}
      />
      <div
        className={`bg-[#FFF156] rounded-t-[3rem] border-t-4 border-black w-full max-w-md shadow-2xl flex flex-col h-[95vh] overflow-hidden relative ${isClosing ? '' : 'animate-slideUp'}`}
        style={dragStyles}
      >
        {/* Drag handle + Header */}
        <div
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <DragHandle />
          <div className="p-6 pt-2 pb-0 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Añadir a la Nevera</h2>
            <button
              onClick={handleClose}
              className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-6 shrink-0 space-y-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7B61FF]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="¿Qué metes en la nevera? (Ej: Yogur...)"
              className="w-full bg-white text-[#475569] pl-12 pr-4 py-4 rounded-2xl font-bold border-2 border-black focus:border-[#7B61FF] transition-all outline-none placeholder:text-slate-300"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7B61FF]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
            </div>
            <select
              value={brandQuery}
              onChange={e => setBrandQuery(e.target.value)}
              className="w-full bg-white text-[#475569] pl-12 pr-10 py-4 rounded-2xl font-bold text-xs border-2 border-black focus:border-[#7B61FF] transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="">Todas las marcas</option>
              {brands.map((brand: string) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            {brandQuery ? (
              <button
                onClick={() => setBrandQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-black hover:text-[#7B61FF] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </div>
            )}
          </div>

          <div className="flex overflow-x-auto gap-2 no-scrollbar py-2 -mx-1 px-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-black ${!selectedCategory ? 'bg-[#7B61FF] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'
                }`}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-black ${selectedCategory === cat.id ? 'bg-[#7B61FF] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'
                  }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
              <div className="w-8 h-8 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consultando base de datos...</p>
            </div>
          ) : results.length > 0 ? (
            results.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFood(f)}
                className="w-full text-left p-4 bg-white rounded-2xl transition-all border-2 border-black group flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 text-sm capitalize truncate">{f.food_name}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black rounded-md shrink-0 uppercase tracking-tighter">
                      Verificado ✅
                    </span>
                  </div>
                  <p className="text-[10px] text-[#475569] font-bold truncate uppercase tracking-widest">
                    {f.brand_name || 'Genérico'} · {f.calories} kcal / 100{f.base_unit || 'g'}
                  </p>
                </div>
                <div className="ml-4 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[#7B61FF] group-hover:bg-[#7B61FF] group-hover:text-white transition-all border-2 border-[#7B61FF]/20 group-hover:border-[#7B61FF]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </button>
            ))
          ) : query.length >= 2 ? (
            <div className="text-center py-12 space-y-6">
              <div className="opacity-50 space-y-2">
                <span className="text-3xl">🏜️</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin coincidencias</p>
              </div>
              <button
                onClick={() => setShowManual(true)}
                className="mx-auto flex items-center gap-2 bg-[#7B61FF]/10 text-[#7B61FF] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#7B61FF] hover:text-white transition-all border-2 border-[#7B61FF]/20"
              >
                <span>Añadir alimento nuevo</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="bg-[#7B61FF] rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-white border-2 border-black rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#7B61FF]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-black text-white text-sm tracking-tight">Busca en la base de datos</h4>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1 px-4 leading-relaxed">
                  Escribe el nombre del alimento para encontrarlo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
