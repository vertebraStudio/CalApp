import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MealType } from '@/types'
import type { MealEntryData } from '@/hooks/useSaveMealEntry'

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Desayuno', icon: '🍳' },
  { id: 'lunch', label: 'Comida', icon: '🥗' },
  { id: 'snack', label: 'Merienda', icon: '🍎' },
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
}

export default function ManualSearch({ onClose, onFoodSelected, onEditFood }: ManualSearchProps) {
  const [query, setQuery] = useState('')
  const [brandQuery, setBrandQuery] = useState('')
  const [brands, setBrands] = useState<string[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)

  const [selectedFood, setSelectedFood] = useState<any | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<MealType>(getDefaultMealType())
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
        const uniqueBrands = Array.from(new Set(data.map(i => i.brand))).filter(Boolean) as string[]
        setBrands(uniqueBrands)
      }
    }
    loadBrands()
  }, [])
  useEffect(() => {
    if (!query.trim() && !brandQuery.trim()) {
      setResults([])
      return
    }

    if (query.length < 2 && brandQuery.length < 2) return

    const timer = setTimeout(async () => {
      setLoadingSearch(true)
      try {
        const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        let supabaseQuery = supabase.from('global_foods').select('*')

        if (query && brandQuery) {
          // Both filters provided
          supabaseQuery = supabaseQuery
            .ilike('name', `%${query}%`)
            .ilike('brand', `%${brandQuery}%`)
        } else if (query) {
          // Only name filter
          supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%,normalized_name.ilike.%${normalizedQuery}%`)
        } else {
          // Only brand filter
          supabaseQuery = supabaseQuery.ilike('brand', `%${brandQuery}%`)
        }

        const { data, error } = await supabaseQuery.limit(20)

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
          serving_size_g: food.serving_size_g,
          serving_unit: food.serving_unit,
          base_unit: food.base_unit
        })) || []

        setResults(mappedResults)
      } catch (err) {
        console.error("Error searching food:", err)
      } finally {
        setLoadingSearch(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query, brandQuery]) // Listen to both

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

    const getWeight = () => {
      if (unit === 'serving') return amount * (selectedFood.serving_size_g || 100)
      if (unit === 'vaso') return amount * 250
      return amount
    }
    const weight = getWeight()
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
    } else if (unit === 'vaso') {
      foodNameExt = `${amount} vaso${amount !== 1 ? 's' : ''} de ${selectedFood.food_name}`
    } else {
      foodNameExt = selectedFood.is_global ? selectedFood.food_name : `${amount}${selectedFood.base_unit || 'g'} ${selectedFood.food_name}`
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
      image_url: selectedFood.image_url
    })
  }

  // Selección de cantidad y confirmación
  if (selectedFood) {
    const getWeight = () => {
      if (unit === 'serving') return amount * (selectedFood.serving_size_g || 100)
      if (unit === 'vaso') return amount * 250
      return amount
    }
    const weight = getWeight()
    const ratio = weight / 100
    const currentCal = Math.round(selectedFood.params_per_100g.calories * ratio)
    const currentP = (selectedFood.params_per_100g.macros.p * ratio).toFixed(1)
    const currentC = (selectedFood.params_per_100g.macros.c * ratio).toFixed(1)
    const currentF = (selectedFood.params_per_100g.macros.f * ratio).toFixed(1)
    const currentSugar = ((selectedFood.params_per_100g.macros.sugar || 0) * ratio).toFixed(1)
    const currentSalt = ((selectedFood.params_per_100g.macros.salt || 0) * ratio).toFixed(2)

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-24 sm:pb-4 animate-fadeIn">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-slideUp">
          {/* Top Bar */}
          <div className="p-6 border-b border-slate-50 shrink-0 flex items-center justify-between">
            <button onClick={() => setSelectedFood(null)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-[#7B61FF] rounded-2xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center flex-1 mx-4">
              <h3 className="font-black text-slate-800 text-lg leading-tight truncate px-2">{selectedFood.food_name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedFood.brand_name || 'Genérico'}</p>
            </div>
            
            <button 
              onClick={() => onEditFood(selectedFood)} 
              className="p-2.5 bg-slate-50 text-slate-400 hover:text-[#7B61FF] rounded-2xl transition-all"
              title="Modificar características"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meal Type */}
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedMealType(t.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all border-2 ${selectedMealType === t.id
                      ? 'bg-[#7B61FF]/5 border-[#7B61FF] text-[#7B61FF]'
                      : 'bg-slate-50 border-transparent text-slate-400'
                    }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[10px] font-black uppercase">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Amount Slider/Input */}
            <div className="bg-slate-50 rounded-3xl p-6 relative overflow-hidden">
              
              {/* Toggle Mode */}
              {(selectedFood.serving_size_g || selectedFood.base_unit === 'ml') && (
                <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6">
                  <button 
                    onClick={() => {
                      if (selectedFood.serving_size_g) {
                        setUnit('serving'); setAmount(1);
                      } else {
                        setUnit('vaso'); setAmount(1);
                      }
                    }}
                    className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all ${
                      (unit === 'serving' || unit === 'vaso') ? 'bg-white text-[#7B61FF] shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    {selectedFood.serving_size_g 
                      ? (selectedFood.serving_unit ? selectedFood.serving_unit + 's' : 'Porciones')
                      : 'Vasos'}
                  </button>
                  <button 
                    onClick={() => { 
                      setUnit('base'); 
                      setAmount(selectedFood.serving_size_g || (selectedFood.base_unit === 'ml' ? 250 : 100)); 
                    }}
                    className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all ${
                      unit === 'base' ? 'bg-white text-[#7B61FF] shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    Exacto ({selectedFood.base_unit || 'g'})
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[14px] font-black text-slate-800 leading-tight">¿Cuánto has tomado?</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                    (Base: {selectedFood.serving_size_g ? `${selectedFood.serving_size_g}${selectedFood.base_unit || 'g'}` : `100${selectedFood.base_unit || 'g'}`})
                  </span>
                </div>
                <div className={`flex items-center gap-2 bg-white transition-all shadow-sm border border-slate-200 focus-within:border-[#7B61FF] shrink-0 ${unit === 'base' ? 'px-4 py-3 rounded-2xl' : 'px-2 py-1.5 rounded-2xl'}`}>
                  {unit !== 'base' && (
                    <button
                      onClick={() => setAmount(prev => Math.max(0, prev - 1))}
                      className="w-11 h-11 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-[#7B61FF] hover:bg-[#7B61FF]/5 rounded-xl transition-all active:scale-90"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                    </button>
                  )}
                  <div className="flex flex-col items-center">
                    <input
                      type="number"
                      step="any"
                      className={`bg-transparent text-center font-black text-[#7B61FF] outline-none ${unit === 'base' ? 'text-2xl w-24' : 'text-xl w-14'}`}
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value) || 0)}
                    />
                    {unit === 'base' && (
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">
                        {selectedFood.base_unit || 'g'}
                      </span>
                    )}
                  </div>
                  {unit !== 'base' && (
                    <button
                      onClick={() => setAmount(prev => prev + 1)}
                      className="w-11 h-11 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-[#7B61FF] hover:bg-[#7B61FF]/5 rounded-xl transition-all active:scale-90"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Resultado Visual de la fórmula */}
              {(unit === 'serving' && selectedFood.serving_size_g) && (
                 <div className="text-center mb-4">
                    <span className="text-[10px] font-bold text-slate-400">
                      Consumiendo: <strong className="text-slate-600">{(amount * selectedFood.serving_size_g).toFixed(0)}{selectedFood.base_unit || 'g'}</strong> ({amount} {selectedFood.serving_unit ? selectedFood.serving_unit + (amount !== 1 ? 's' : '') : 'porciones'})
                    </span>
                 </div>
              )}
              {unit === 'vaso' && (
                 <div className="text-center mb-4">
                    <span className="text-[10px] font-bold text-slate-400">
                      Consumiendo: <strong className="text-slate-600">{(amount * 250).toFixed(0)}ml</strong> ({amount} vaso{amount !== 1 ? 's' : ''})
                    </span>
                 </div>
              )}

              <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                <span className="text-sm font-bold text-slate-500">Energía Total</span>
                <span className="text-2xl font-black text-[#5BC897]">{currentCal} kcal</span>
              </div>
            </div>

            {/* Detailed Macros */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100/50 text-center">
                  <p className="text-[9px] font-bold text-blue-400 uppercase">Proteínas</p>
                  <p className="text-base font-black text-blue-600">{currentP}g</p>
                </div>
                <div className="bg-green-50/50 rounded-2xl p-3 border border-green-100/50 text-center">
                  <p className="text-[9px] font-bold text-green-400 uppercase">Carbohid.</p>
                  <p className="text-base font-black text-green-600">{currentC}g</p>
                </div>
                <div className="bg-orange-50/50 rounded-2xl p-3 border border-orange-100/50 text-center">
                  <p className="text-[9px] font-bold text-orange-400 uppercase">Grasas</p>
                  <p className="text-base font-black text-orange-600">{currentF}g</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-pink-50/50 rounded-2xl p-3 border border-pink-100/50 flex justify-between items-center px-4">
                  <span className="text-[10px] font-bold text-pink-400 uppercase">Azúcares</span>
                  <span className="text-sm font-black text-pink-600">{currentSugar}g</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex justify-between items-center px-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sal</span>
                  <span className="text-sm font-black text-slate-600">{currentSalt}g</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 shrink-0">
            <button
              onClick={handleSave}
              className="w-full bg-[#7B61FF] hover:bg-[#684DEC] text-white rounded-3xl py-5 text-lg font-black shadow-xl shadow-purple-200 transition-all active:scale-[0.98]"
            >
              Confirmar Ingesta 🚀
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pt-12 sm:pt-4 pb-24 sm:pb-4 animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] animate-slideUp">

        <div className="p-6 pb-0 shrink-0 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Buscar Alimento</h2>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 shrink-0 space-y-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-[#7B61FF] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="¿Qué buscas? (Ej: Yogur...)"
              className="w-full bg-slate-50 text-slate-800 pl-12 pr-4 py-4 rounded-2xl font-bold border-2 border-transparent focus:border-[#7B61FF]/30 focus:bg-white transition-all outline-none placeholder:text-slate-300"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-[#7B61FF] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
            </div>
            <select
              value={brandQuery}
              onChange={e => setBrandQuery(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 pl-12 pr-10 py-4 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-[#7B61FF]/30 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="">Todas las marcas</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {loadingSearch ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
              <div className="w-8 h-8 border-3 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consultando base de datos...</p>
            </div>
          ) : results.length > 0 ? (
            results.map((food) => (
              <button
                key={food.food_id}
                onClick={() => setSelectedFood(food)}
                className="w-full text-left p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group flex items-start justify-between"
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
                  <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-widest">
                    {food.brand_name || 'Genérico'} · {food.serving_size_g 
                      ? Math.round(food.params_per_100g.calories * (food.serving_size_g / 100))
                      : food.params_per_100g.calories} kcal / {food.serving_size_g 
                      ? (food.serving_unit ? `1 ${food.serving_unit}` : `${food.serving_size_g}${food.base_unit || 'g'}`) 
                      : '100g'}
                  </p>
                </div>
                <div className="ml-4 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#7B61FF] group-hover:text-white transition-all">
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
                onClick={() => onFoodSelected({})}
                className="mx-auto flex items-center gap-2 bg-[#7B61FF]/10 text-[#7B61FF] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#7B61FF] hover:text-white transition-all border-2 border-[#7B61FF]/20"
              >
                <span>Añadir alimento nuevo</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </button>
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

        <div className="p-6 bg-slate-50/50 mt-auto border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-[#7B61FF] font-black uppercase tracking-widest">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Sincronizado con la comunidad
        </div>
      </div>
    </div>
  )
}
