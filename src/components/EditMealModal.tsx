import { useState, useEffect } from 'react'
import type { Meal, MealType } from '@/types'
import { getFriendlyMeasures, normalizeToWeight } from '@/utils/conversions'

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Desayuno', icon: '🍳' },
  { id: 'lunch', label: 'Comida', icon: '🥗' },
  { id: 'snack', label: 'Snacks', icon: '🍎' },
  { id: 'dinner', label: 'Cena', icon: '🍲' },
]

interface EditMealModalProps {
  meal: Meal
  onClose: () => void
  onUpdate: (id: string, data: any) => Promise<boolean>
  isUpdating: boolean
}

export default function EditMealModal({ meal, onClose, onUpdate, isUpdating }: EditMealModalProps) {
  const [editAmount, setEditAmount] = useState<number>(100)
  const [editUnit, setEditUnit] = useState<string>('base')
  const [editMealType, setEditMealType] = useState<MealType>(meal.meal_type)

  const friendlyMeasures = getFriendlyMeasures(
    !!meal.is_liquid,
    meal.friendly_measures,
    meal.serving_unit,
    meal.categoria
  )

  useEffect(() => {
    // Calculate initial amount based on stored calories vs base_calories
    const ratio = meal.base_calories ? (meal.calories / meal.base_calories) : 1

    if (meal.serving_size_g && Math.abs(ratio - (meal.serving_size_g / 100)) < 0.01) {
      setEditUnit('serving')
      setEditAmount(1)
    } else {
      setEditUnit('base')
      setEditAmount(Math.round(ratio * 100))
    }

    setEditMealType(meal.meal_type)
  }, [meal])

  const handleUpdate = async () => {
    const baseCalories = meal.base_calories || (meal.calories / (editAmount / 100 || 1))
    const baseP = meal.base_protein || (meal.protein / (editAmount / 100 || 1))
    const baseC = meal.base_carbs || (meal.carbs / (editAmount / 100 || 1))
    const baseF = meal.base_fats || (meal.fats / (editAmount / 100 || 1))
    const baseSugar = meal.base_sugar ?? (meal.sugar / (editAmount / 100 || 1))
    const baseSalt = meal.base_salt ?? (meal.salt / (editAmount / 100 || 1))

    const weight = normalizeToWeight(editAmount, editUnit, {
      is_liquid: meal.is_liquid,
      serving_size_g: meal.serving_size_g,
      friendly_measures: meal.friendly_measures
    })

    const ratio = weight / 100

    let foodNameExt = ''
    if (editUnit === 'serving') {
      const uName = meal.serving_unit ? (editAmount === 1 ? meal.serving_unit : `${meal.serving_unit}s`) : 'porciones'
      foodNameExt = `${editAmount} ${uName} de ${meal.name}`
    } else if (editUnit === 'base') {
      foodNameExt = meal.name.includes(' de ') ? meal.name.split(' de ').slice(1).join(' de ') : meal.name
    } else {
      foodNameExt = `${editAmount} ${editUnit}${editAmount !== 1 ? 's' : ''} de ${meal.name.includes(' de ') ? meal.name.split(' de ').slice(1).join(' de ') : meal.name}`
    }

    const success = await onUpdate(meal.id, {
      food_name: foodNameExt,
      calories: Math.round(baseCalories * ratio),
      macros: {
        p: Number((baseP * ratio).toFixed(1)),
        c: Number((baseC * ratio).toFixed(1)),
        f: Number((baseF * ratio).toFixed(1)),
        sugar: Number((baseSugar * ratio).toFixed(1)),
        salt: Number((baseSalt * ratio).toFixed(2))
      },
      meal_type: editMealType,
      image_url: meal.image_url,
      base_values: {
        calories: baseCalories,
        p: baseP,
        c: baseC,
        f: baseF,
        sugar: baseSugar,
        salt: baseSalt,
        serving_size_g: meal.serving_size_g,
        serving_unit: meal.serving_unit,
        base_unit: meal.base_unit,
        is_liquid: meal.is_liquid,
        friendly_measures: meal.friendly_measures
      }
    })
    if (success) onClose()
  }

  const currentWeight = normalizeToWeight(editAmount, editUnit, {
    is_liquid: !!meal.is_liquid,
    serving_size_g: meal.serving_size_g,
    friendly_measures: meal.friendly_measures,
    categoria: meal.categoria
  })
  const currentRatio = currentWeight / 100

  const overlayStyles = {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fadeIn"
        style={overlayStyles}
        onClick={onClose}
      />
      <div className="bg-[#FFF156] rounded-t-[3rem] border-t-4 border-black w-full max-w-md shadow-2xl flex flex-col h-[90vh] sm:h-[85vh] overflow-hidden relative animate-slideUp">

        {/* Drag Handle / Header */}
        <div className="shrink-0 p-6 pt-4 pb-2">
          <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mb-6" />
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="shrink-0 w-12 h-12 bg-white border-2 border-black flex items-center justify-center rounded-[1.25rem] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-800 text-xl leading-tight truncate">{meal.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Editar Registro</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Meal Type */}
          <div className="flex gap-2 rounded-full justify-between mt-2">
            {MEAL_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setEditMealType(t.id)}
                className={`flex-1 py-2 rounded-[1rem] border-2 transition-all font-black text-[9px] uppercase tracking-wider ${editMealType === t.id ? 'bg-[#7B61FF] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-400 border-black'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* friendly measures carousel */}
            <div>
              <span className="text-[10px] font-black text-[#7B61FF] uppercase tracking-widest block mb-2 px-1">Selecciona Medida</span>
              <div className="bg-white rounded-3xl border-2 border-black flex overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {meal.serving_size_g && (
                  <button
                    onClick={() => { setEditUnit('serving'); setEditAmount(1); }}
                    className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-black transition-all ${editUnit === 'serving' ? 'bg-[#7B61FF] text-white' : 'text-slate-400 hover:bg-slate-50'
                      }`}
                  >
                    {meal.serving_unit || 'Porción'}
                  </button>
                )}
                {friendlyMeasures.map(m => (
                  <button
                    key={m.name}
                    onClick={() => { setEditUnit(m.name); setEditAmount(1); }}
                    className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-black transition-all border-l-2 border-black ${editUnit === m.name ? 'bg-[#7B61FF] text-white' : 'text-slate-400 hover:bg-slate-50'
                      }`}
                  >
                    {m.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setEditUnit('base');
                    setEditAmount(meal.serving_size_g || 100);
                  }}
                  className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-black transition-all border-l-2 border-black ${editUnit === 'base' ? 'bg-[#7B61FF] text-white' : 'text-slate-400 hover:bg-slate-50'
                    }`}
                >
                  Exacto
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
              <div className="flex items-center justify-between gap-6 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cantidad</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
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
                      let rawUnit = editUnit === 'serving'
                        ? (meal.serving_unit || 'porción')
                        : (editUnit === 'base' ? (meal.base_unit || 'g') : editUnit)
                      if (editUnit === 'base') return rawUnit
                      const base = singular[rawUnit.toLowerCase()] || rawUnit
                      return editAmount <= 1 ? base : (plural[base.toLowerCase()] || `${base}s`)
                    })()}
                  </span>
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                    (BASE: {meal.serving_size_g ? `${meal.serving_size_g}${meal.base_unit || 'g'}` : `100${meal.base_unit || 'g'}`})
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 h-14">
                  {editUnit !== 'base' && (
                    <button
                      onClick={() => setEditAmount((prev) => Math.max(0.5, prev - 0.5))}
                      className="w-11 h-11 flex items-center justify-center bg-white text-slate-400 rounded-xl transition-all active:scale-95 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 12H6" /></svg>
                    </button>
                  )}
                  {editUnit !== 'base' && (
                    <button
                      onClick={() => setEditAmount((prev) => prev + 1)}
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
              <span className="text-4xl font-black text-black tracking-tighter">
                {Math.round((meal.base_calories || (meal.calories / (meal.serving_size_g || 100) * 100)) * currentRatio)} <span className="text-2xl">kcal</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-[24px] p-4 border-2 border-black flex flex-col items-center justify-center">
                <p className="text-[9px] font-black text-slate-800/40 uppercase tracking-widest leading-none mb-1">Proteínas</p>
                <p className="text-xl font-black text-slate-800 leading-none">{((meal.base_protein || 0) * currentRatio).toFixed(1)}<span className="text-xs ml-0.5">g</span></p>
              </div>
              <div className="bg-white rounded-[24px] p-4 border-2 border-black flex flex-col items-center justify-center">
                <p className="text-[9px] font-black text-slate-800/40 uppercase tracking-widest leading-none mb-1">Carbohid.</p>
                <p className="text-xl font-black text-slate-800 leading-none">{((meal.base_carbs || 0) * currentRatio).toFixed(1)}<span className="text-xs ml-0.5">g</span></p>
              </div>
              <div className="bg-white rounded-[24px] p-4 border-2 border-black flex flex-col items-center justify-center">
                <p className="text-[9px] font-black text-slate-800/40 uppercase tracking-widest leading-none mb-1">Grasas</p>
                <p className="text-xl font-black text-slate-800 leading-none">{((meal.base_fats || 0) * currentRatio).toFixed(1)}<span className="text-xs ml-0.5">g</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FCE7F3] rounded-[24px] p-4 border-2 border-black flex justify-between items-center px-5">
                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Azúcares</span>
                <span className="text-lg font-black text-pink-600 leading-none">{((meal.base_sugar ?? 0) * currentRatio).toFixed(1)}g</span>
              </div>
              <div className="bg-[#DBEAFE] rounded-[24px] p-4 border-2 border-black flex justify-between items-center px-5">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Sal</span>
                <span className="text-lg font-black text-blue-700 leading-none">{((meal.base_salt ?? 0) * currentRatio).toFixed(2)}g</span>
              </div>
            </div>

            <div className="pt-2 pb-2">
              <button onClick={handleUpdate} disabled={isUpdating} className="w-full bg-[#7B61FF] text-white border-2 border-black rounded-[32px] py-5 text-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50">
                {isUpdating ? 'Actualizando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
