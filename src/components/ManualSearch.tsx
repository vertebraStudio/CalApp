import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { getFriendlyMeasures, normalizeToWeight } from '@/utils/conversions'
import type { MealType } from '@/types'
import type { MealEntryData } from '@/hooks/useSaveMealEntry'

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Desayuno', icon: '🍳' },
  { id: 'lunch', label: 'Comida', icon: '🥗' },
  { id: 'snack', label: 'Snacks', icon: '🍎' },
  { id: 'dinner', label: 'Cena', icon: '🍲' },
]

function getDefaultMealType(): MealType {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 16) return 'lunch'
  if (hour >= 16 && hour < 20) return 'snack'
  return 'dinner'
}

interface ManualSearchProps {
  onClose: () => void
  onFoodSelected: (data: Partial<MealEntryData>) => void
  onEditFood: (food: any) => void
  initialMealType?: MealType
}

export default function ManualSearch({ onClose, onFoodSelected, onEditFood, initialMealType }: ManualSearchProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [brandQuery, setBrandQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [results, setResults] = useState<any[]>([])
  const [recentMeals, setRecentMeals] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)

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
    if (deltaY > 0) {
      setDragOffset(deltaY)
    }
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

  // Función robusta para limpiar el nombre de cantidades y unidades (ej: "2 puñados de 1 unidad de Pistacho" -> "Pistacho")
  const getBaseName = (name: string) => {
    if (!name) return '';
    let current = name;
    let changed = true;
    
    // Intentamos limpiar mientras sigamos detectando patrones de cantidad al inicio
    while (changed) {
      changed = false;
      const original = current;
      
      // Patrón 1: "[Número] [Unidad]? de [Resto]" -> "2 puñados de Arroz" o "1 unidad de Arroz"
      const deMatch = current.match(/^\d+(?:[.,]\d+)?\s*[\w\u00C0-\u017F]*\s+de\s+(.*)$/i);
      if (deMatch) {
        current = deMatch[1];
        changed = true;
      } 
      // Patrón 2: "[Número][Unidad] [Resto]" -> "100g Arroz" o "200ml Agua"
      else {
        const spaceMatch = current.match(/^(\d+(?:[.,]\d+)?\s*[a-zA-Z\u00C0-\u017F]{1,8})\s+(.*)$/);
        if (spaceMatch) {
          const prefix = spaceMatch[1];
          // Solo si el prefijo parece una cantidad (tiene número y es corto o termina en unidad conocida)
          if (/^\d/.test(prefix)) {
             current = spaceMatch[2];
             changed = true;
          }
        }
      }
      
      if (current === original) break;
    }
    
    return current.trim();
  };

  const [selectedFood, setSelectedFood] = useState<any | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType || getDefaultMealType())
  const [amount, setAmount] = useState<number>(100)
  const [unit, setUnit] = useState<string>('base')

  // Fetch unique brands on mount
  useEffect(() => {
    async function loadBrands() {
      const { data, error } = await supabase
        .from('global_foods')
        .select('brand')
        .not('brand', 'is', null)
        .order('brand')

      if (!error && data) {
        // Normalize to Title Case and de-duplicate case-insensitively
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

  // Fetch recent meals
  useEffect(() => {
    if (!user) return
    async function loadRecent() {
      // 1. Obtener últimas ingestas
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && mealsData) {
        // 2. Extraer nombres base únicos para validar existencia
        const baseNameToMealMap: Record<string, any> = {}
        const baseNamesList: string[] = []

        for (const m of mealsData) {
          const cleanName = getBaseName(m.name)
          if (!baseNameToMealMap[cleanName]) {
            baseNamesList.push(cleanName)
            baseNameToMealMap[cleanName] = m
          }
        }

        if (baseNamesList.length === 0) {
           setRecentMeals([])
           return
        }

        // 3. Consultar si esos alimentos existen en las tablas maestras
        // Consultamos tanto alimentos del usuario como globales
        const [foodsRes, globalRes] = await Promise.all([
          supabase.from('foods').select('*').eq('user_id', user.id).in('food_name', baseNamesList),
          supabase.from('global_foods').select('*').in('food_name', baseNamesList)
        ])

        const validFoods = [...(foodsRes.data || []), ...(globalRes.data || [])]
        
        // 4. Mapear y reconstruir la lista solo con lo existente y actualizado
        const finalRecent: any[] = []
        const addedBaseNames = new Set()

        // Iteramos sobre los nombres originales en orden de "reciente"
        for (const baseName of baseNamesList) {
          // Buscamos si el alimento base existe ahora en la DB
          const currentFood = validFoods.find(f => f.food_name === baseName)
          
          if (currentFood && !addedBaseNames.has(baseName)) {
            addedBaseNames.add(baseName)
            
            // Reconstruimos el objeto del alimento reciente usando los datos ACTUALES de la DB
            finalRecent.push({
              id: currentFood.id,
              name: currentFood.food_name,
              calories: currentFood.calories || currentFood.params_per_100g?.calories,
              protein: currentFood.protein || currentFood.params_per_100g?.macros?.p,
              carbs: currentFood.carbs || currentFood.params_per_100g?.macros?.c,
              fats: currentFood.fats || currentFood.params_per_100g?.macros?.f,
              sugar: currentFood.sugar || currentFood.params_per_100g?.macros?.sugar,
              salt: currentFood.salt || currentFood.params_per_100g?.macros?.salt,
              image_url: currentFood.image_url,
              categoria: currentFood.categoria,
              serving_size_g: currentFood.serving_size_g,
              serving_unit: currentFood.serving_unit,
              base_unit: currentFood.base_unit,
              is_liquid: !!currentFood.is_liquid,
              friendly_measures: currentFood.friendly_measures,
              is_global: !!currentFood.is_global
            })
          }
        }

        setRecentMeals(finalRecent.slice(0, 10))
      }
    }
    loadRecent()
  }, [user])

  useEffect(() => {
    if (!query.trim() && !brandQuery.trim() && !selectedCategory) {
      setResults([])
      return
    }

    if (query.length < 2 && brandQuery.length < 2 && !selectedCategory) return

    const timer = setTimeout(async () => {
      setLoadingSearch(true)
      try {
        const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        let supabaseQuery = supabase.from('global_foods').select('*, is_liquid, friendly_measures')

        if (query && brandQuery) {
          // Both filters provided
          supabaseQuery = supabaseQuery
            .ilike('name', `%${query}%`)
            .ilike('brand', `%${brandQuery}%`)
        } else if (query) {
          // Only name filter
          supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%,normalized_name.ilike.%${normalizedQuery}%`)
        } else if (brandQuery) {
          // Only brand filter
          supabaseQuery = supabaseQuery.ilike('brand', `%${brandQuery}%`)
        }

        if (selectedCategory) {
          supabaseQuery = supabaseQuery.eq('categoria', selectedCategory)
        }

        const { data, error } = await supabaseQuery.order('name', { ascending: true }).limit(20)

        if (error) throw error

        // Map global_foods schema to the expected result format
        const mappedResults = data?.map(food => ({
          food_id: food.id,
          food_name: food.name,
          brand_name: food.brand,
          is_global: true,
          params_per_100g: {
            calories: food.calories_per_100g,
            macros: {
              p: food.protein_per_100g,
              c: food.carbs_per_100g,
              f: food.fats_per_100g,
              sugar: food.sugar_per_100g,
              salt: food.salt_per_100g
            }
          },
          image_url: food.image_url,
          categoria: food.categoria,
          serving_size_g: food.serving_size_g,
          serving_unit: food.serving_unit,
          base_unit: food.base_unit,
          is_liquid: food.is_liquid,
          friendly_measures: food.friendly_measures
        })) || []

        setResults(mappedResults)
      } catch (err) {
        console.error("Error searching food:", err)
      } finally {
        setLoadingSearch(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query, brandQuery, selectedCategory])

  // Update initial units when selecting a food
  useEffect(() => {
    if (selectedFood) {
      if (selectedFood.serving_size_g) {
        setUnit('serving')
        setAmount(1)
      } else {
        setUnit('base')
        setAmount(100)
      }
    }
  }, [selectedFood])

  const handleSave = () => {
    if (!selectedFood) return

    const weight = normalizeToWeight(amount, unit, {
      is_liquid: selectedFood.is_liquid,
      serving_size_g: selectedFood.serving_size_g,
      friendly_measures: selectedFood.friendly_measures
    })

    const ratio = weight / 100
    const finalCalories = Math.round(selectedFood.params_per_100g.calories * ratio)
    const finalP = Number((selectedFood.params_per_100g.macros.p * ratio).toFixed(1))
    const finalC = Number((selectedFood.params_per_100g.macros.c * ratio).toFixed(1))
    const finalF = Number((selectedFood.params_per_100g.macros.f * ratio).toFixed(1))
    const finalSugar = Number(((selectedFood.params_per_100g.macros.sugar || 0) * ratio).toFixed(1))
    const finalSalt = Number(((selectedFood.params_per_100g.macros.salt || 0) * ratio).toFixed(2))

    let foodNameExt = ''
    if (unit === 'serving') {
      const uName = selectedFood.serving_unit ? (amount === 1 ? selectedFood.serving_unit : `${selectedFood.serving_unit}s`) : 'porciones'
      foodNameExt = `${amount} ${uName} de ${selectedFood.food_name}`
    } else if (unit === 'base') {
      foodNameExt = selectedFood.is_global ? selectedFood.food_name : `${amount}${selectedFood.base_unit || 'g'} ${selectedFood.food_name}`
    } else {
      foodNameExt = `${amount} ${unit}${amount !== 1 ? 's' : ''} de ${selectedFood.food_name}`
    }

    onFoodSelected({
      food_name: foodNameExt,
      calories: finalCalories,
      macros: {
        p: finalP,
        c: finalC,
        f: finalF,
        sugar: finalSugar,
        salt: finalSalt
      },
      meal_type: selectedMealType,
      image_url: selectedFood.image_url,
      categoria: selectedFood.categoria,
      base_values: {
        calories: selectedFood.params_per_100g.calories,
        p: selectedFood.params_per_100g.macros.p,
        c: selectedFood.params_per_100g.macros.c,
        f: selectedFood.params_per_100g.macros.f,
        sugar: selectedFood.params_per_100g.macros.sugar,
        salt: selectedFood.params_per_100g.macros.salt,
        serving_size_g: selectedFood.serving_size_g,
        serving_unit: selectedFood.serving_unit,
        base_unit: selectedFood.base_unit,
        is_liquid: selectedFood.is_liquid,
        friendly_measures: selectedFood.friendly_measures
      }
    })
  }

  // Selección de cantidad y confirmación
  if (selectedFood) {
    const weight = normalizeToWeight(amount, unit, {
      is_liquid: selectedFood.is_liquid,
      serving_size_g: selectedFood.serving_size_g,
      friendly_measures: selectedFood.friendly_measures,
      categoria: selectedFood.categoria
    })

    const ratio = weight / 100
    const currentCal = Math.round(selectedFood.params_per_100g.calories * ratio)
    const currentP = (selectedFood.params_per_100g.macros.p * ratio).toFixed(1)
    const currentC = (selectedFood.params_per_100g.macros.c * ratio).toFixed(1)
    const currentF = (selectedFood.params_per_100g.macros.f * ratio).toFixed(1)
    const currentSugar = ((selectedFood.params_per_100g.macros.sugar || 0) * ratio).toFixed(1)
    const currentSalt = ((selectedFood.params_per_100g.macros.salt || 0) * ratio).toFixed(2)

    const friendlyMeasures = getFriendlyMeasures(
      !!selectedFood.is_liquid,
      selectedFood.friendly_measures,
      selectedFood.serving_unit,
      selectedFood.categoria
    )

    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        <div
          className="absolute inset-0 animate-fadeIn"
          style={overlayStyles}
          onClick={() => {
            setIsClosing(true);
            setDragOffset(window.innerHeight);
            setTimeout(onClose, 300);
          }}
        />
        <div
          className={`bg-[#FFF156] rounded-t-[3rem] border-t-4 border-black w-full max-w-md shadow-2xl flex flex-col h-[95vh] overflow-hidden relative ${isClosing ? '' : 'animate-slideUp'}`}
          style={dragStyles}
        >
          <div
            className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <DragHandle />
            <div className="p-6 pt-2 flex items-center gap-4">
              <button onClick={() => setSelectedFood(null)} className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all">
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

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedMealType(t.id)}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-[20px] transition-all border-2 border-black ${selectedMealType === t.id
                    ? 'bg-[#7B61FF] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-slate-400'
                    }`}
                >
                  <span className="text-xl group-active:scale-110 transition-transform">{t.icon}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Selecciona Medida</h4>
              <div className="flex bg-slate-100 p-1 rounded-[24px] border-2 border-black h-14">
                <div className="flex w-full">
                  {selectedFood.serving_size_g && (
                    <button
                      onClick={() => { setUnit('serving'); setAmount(1); }}
                      className={`flex-1 text-[10px] uppercase tracking-widest font-black rounded-[20px] transition-all ${unit === 'serving' ? 'bg-[#7B61FF] text-white border-2 border-black' : 'text-slate-400'
                        }`}
                    >
                      {selectedFood.serving_unit || 'Porción'}
                    </button>
                  )}
                  {(() => {
                    const dbUnit = selectedFood.serving_unit?.toLowerCase();
                    return friendlyMeasures
                      .filter(m => m.name.toLowerCase() !== dbUnit)
                      .map(m => (
                        <button
                          key={m.name}
                          onClick={() => { setUnit(m.name); setAmount(1); }}
                          className={`flex-1 text-[10px] uppercase tracking-widest font-black rounded-[20px] transition-all ${unit === m.name ? 'bg-[#7B61FF] text-white border-2 border-black' : 'text-slate-400'
                            }`}
                        >
                          {m.name}
                        </button>
                      ));
                  })()}
                  <button
                    onClick={() => {
                      setUnit('base');
                      setAmount(selectedFood.serving_size_g || 100);
                    }}
                    className={`flex-1 text-[10px] uppercase tracking-widest font-black rounded-[20px] transition-all ${unit === 'base' ? 'bg-[#7B61FF] text-white border-2 border-black' : 'text-slate-400'
                      }`}
                  >
                    Exacto
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-[32px] p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">

                <div className="flex items-center justify-between gap-6 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cantidad</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="text-5xl font-black text-black bg-transparent outline-none w-24"
                    />
                    <span className="text-xs font-bold text-[#7B61FF] uppercase tracking-widest mt-1">
                      {(() => {
                        const singular: Record<string, string> = {
                          'porciones': 'porción',
                          'puñados': 'puñado', 'puñado': 'puñado',
                          'cucharadas': 'cucharada', 'cucharada': 'cucharada',
                          'vasos': 'vaso', 'vaso': 'vaso',
                          'tazas': 'taza', 'taza': 'taza',
                          'chorritos': 'chorrito', 'chorrito': 'chorrito',
                          'latas': 'lata', 'lata': 'lata',
                          'botellas': 'botella', 'botella': 'botella',
                          'unidades': 'unidad', 'unidad': 'unidad',
                          'rebanadas': 'rebanada', 'rebanada': 'rebanada',
                          'piezas': 'pieza', 'pieza': 'pieza',
                          'barritas': 'barrita', 'barrita': 'barrita',
                        }
                        const plural: Record<string, string> = {
                          'porción': 'porciones',
                          'puñado': 'puñados',
                          'cucharada': 'cucharadas',
                          'vaso': 'vasos',
                          'taza': 'tazas',
                          'chorrito': 'chorritos',
                          'lata': 'latas',
                          'botella': 'botellas',
                          'unidad': 'unidades',
                          'rebanada': 'rebanadas',
                          'pieza': 'piezas',
                          'barrita': 'barritas',
                        }
                        let rawUnit = unit === 'serving'
                          ? (selectedFood.serving_unit || 'porción')
                          : (unit === 'base' ? (selectedFood.base_unit || 'g') : unit)
                        if (unit === 'base') return rawUnit // g, ml, etc. no pluralizan
                        const base = singular[rawUnit.toLowerCase()] || rawUnit
                        return amount <= 1 ? base : (plural[base.toLowerCase()] || `${base}s`)
                      })()}
                    </span>
                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                      (BASE: {selectedFood.serving_size_g ? `${selectedFood.serving_size_g}${selectedFood.base_unit || 'g'}` : `100${selectedFood.base_unit || 'g'}`})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 h-14">
                    {unit !== 'base' && (
                      <button
                        onClick={() => setAmount((prev: number) => Math.max(0.5, prev - 0.5))}
                        className="w-11 h-11 flex items-center justify-center bg-white text-slate-400 rounded-xl transition-all active:scale-95 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 12H6" /></svg>
                      </button>
                    )}
                    {unit !== 'base' && (
                      <button
                        onClick={() => setAmount((prev: number) => prev + 1)}
                        className="w-11 h-11 flex items-center justify-center bg-white text-[#7B61FF] rounded-xl transition-all active:scale-95 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v12m6-6H6" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[24px] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center gap-1">
                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Energía Total</span>
                <span className="text-4xl font-black text-black tracking-tighter">{currentCal} <span className="text-2xl">kcal</span></span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-[24px] p-4 border-2 border-black flex flex-col items-center justify-center">
                  <p className="text-[9px] font-black text-slate-800/40 uppercase tracking-widest leading-none mb-1">Proteínas</p>
                  <p className="text-xl font-black text-slate-800 leading-none">{currentP}<span className="text-xs ml-0.5">g</span></p>
                </div>
                <div className="bg-white rounded-[24px] p-4 border-2 border-black flex flex-col items-center justify-center">
                  <p className="text-[9px] font-black text-slate-800/40 uppercase tracking-widest leading-none mb-1">Carbohid.</p>
                  <p className="text-xl font-black text-slate-800 leading-none">{currentC}<span className="text-xs ml-0.5">g</span></p>
                </div>
                <div className="bg-white rounded-[24px] p-4 border-2 border-black flex flex-col items-center justify-center">
                  <p className="text-[9px] font-black text-slate-800/40 uppercase tracking-widest leading-none mb-1">Grasas</p>
                  <p className="text-xl font-black text-slate-800 leading-none">{currentF}<span className="text-xs ml-0.5">g</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FCE7F3] rounded-[24px] p-4 border-2 border-black flex justify-between items-center px-5">
                  <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Azúcares</span>
                  <span className="text-lg font-black text-pink-600 leading-none">{currentSugar}g</span>
                </div>
                <div className="bg-[#DBEAFE] rounded-[24px] p-4 border-2 border-black flex justify-between items-center px-5">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Sal</span>
                  <span className="text-lg font-black text-blue-700 leading-none">{currentSalt}g</span>
                </div>
              </div>

              <div className="pt-2 pb-2">
                <button
                  onClick={handleSave}
                  className="w-full bg-[#7B61FF] text-white border-2 border-black rounded-[32px] py-5 text-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
                >
                  Confirmar Ingesta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fadeIn"
        style={overlayStyles}
        onClick={() => {
          setIsClosing(true);
          setDragOffset(window.innerHeight);
          setTimeout(onClose, 300);
        }}
      />
      <div
        className={`bg-[#FFF156] rounded-t-[3rem] border-t-4 border-black w-full max-w-md shadow-2xl flex flex-col h-[95vh] overflow-hidden relative ${isClosing ? '' : 'animate-slideUp'}`}
        style={dragStyles}
      >
        <div
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <DragHandle />

          <div className="p-6 pt-2 pb-0 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Buscar Alimento</h2>
            <button onClick={onClose} className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

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
              placeholder="¿Qué buscas? (Ej: Yogur...)"
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

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {loadingSearch ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
              <div className="w-8 h-8 border-3 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consultando base de datos...</p>
            </div>
          ) : results.length > 0 ? (
            results.map((food: any) => (
              <button
                key={food.food_id}
                onClick={() => setSelectedFood(food)}
                className="w-full text-left p-4 bg-white rounded-2xl transition-all border-2 border-black group flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 text-sm capitalize truncate">{food.food_name}</span>
                    {food.is_global && (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black rounded-md shrink-0 uppercase tracking-tighter">
                        Verificado ✅
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#475569] font-bold truncate uppercase tracking-widest">
                    {food.brand_name || 'Genérico'} · {food.serving_size_g
                      ? Math.round(food.params_per_100g.calories * (food.serving_size_g / 100))
                      : food.params_per_100g.calories} kcal / {food.serving_size_g
                        ? (food.serving_unit ? `1 ${food.serving_unit}` : `${food.serving_size_g}${food.base_unit || 'g'}`)
                        : '100g'}
                  </p>
                </div>
                <div className="ml-4 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[#7B61FF] group-hover:bg-[#7B61FF] group-hover:text-white transition-all border-2 border-[#7B61FF]/20 group-hover:border-[#7B61FF]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                </div>
              </button>
            ))
          ) : query.length > 2 ? (
            <div className="text-center py-12 space-y-6">
              <div className="opacity-50 space-y-2">
                <span className="text-3xl">🏜️</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin coincidencias en la comunidad</p>
              </div>

              <button
                onClick={() => onEditFood({})}
                className="mx-auto flex items-center gap-2 bg-[#7B61FF]/10 text-[#7B61FF] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#7B61FF] hover:text-white transition-all border-2 border-[#7B61FF]/20"
              >
                <span>Añadir alimento nuevo</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          ) : query.length === 0 && recentMeals.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xl">🕒</span>
                <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Consumidos recientemente</h4>
              </div>
              <div className="space-y-2">
                {recentMeals.map((meal: any) => (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedFood({
                      food_id: meal.id,
                      food_name: meal.name,
                      brand_name: meal.is_global ? 'Global' : 'Tu Biblioteca',
                      params_per_100g: {
                        calories: meal.calories,
                        macros: {
                          p: meal.protein,
                          c: meal.carbs,
                          f: meal.fats,
                          sugar: meal.sugar,
                          salt: meal.salt
                        }
                      },
                      image_url: meal.image_url,
                      categoria: meal.categoria,
                      base_unit: meal.base_unit || 'g',
                      serving_size_g: meal.serving_size_g || 100,
                      serving_unit: meal.serving_unit,
                      friendly_measures: meal.friendly_measures,
                      is_liquid: meal.is_liquid,
                      is_global: meal.is_global
                    })}
                    className="w-full text-left p-4 bg-white rounded-2xl transition-all border-2 border-black group flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 text-sm truncate">{meal.name}</span>
                      </div>
                      <p className="text-[10px] text-[#475569] font-bold truncate uppercase tracking-widest">
                        {meal.calories} kcal · {meal.protein}P / {meal.carbs}C / {meal.fats}F
                      </p>
                    </div>
                    <div className="ml-4 w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#7B61FF] group-hover:scale-110 shadow-sm transition-all border-2 border-[#7B61FF]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-slate-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">Biblioteca Global de Alimentos</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 px-4 leading-relaxed">
                  Busca productos de supermercado verificados por la comunidad.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

