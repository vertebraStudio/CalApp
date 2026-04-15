import React, { useState, useEffect } from 'react'
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
    meal.serving_unit
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
    is_liquid: meal.is_liquid,
    serving_size_g: meal.serving_size_g,
    friendly_measures: meal.friendly_measures
  })
  const currentRatio = currentWeight / 100

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-20 sm:pb-4 animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col max-h-[82vh] overflow-hidden animate-slideUp">
        
        {/* Product Cover / Header */}
        <div className="relative h-48 sm:h-56 shrink-0 group">
          {editMealType === 'breakfast' && <div className="absolute inset-0 bg-orange-500/10" />}
          {editMealType === 'lunch' && <div className="absolute inset-0 bg-green-500/10" />}
          {editMealType === 'snack' && <div className="absolute inset-0 bg-pink-500/10" />}
          {editMealType === 'dinner' && <div className="absolute inset-0 bg-blue-500/10" />}

          {meal.image_url ? (
            <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <span className="text-6xl">🍲</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2.5 bg-white/80 hover:bg-white backdrop-blur-md text-slate-400 hover:text-red-500 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="font-black text-slate-800 text-xl leading-tight truncate">{meal.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Editar Registro</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-0">
          {/* Meal Type */}
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setEditMealType(t.id)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all border-2 ${editMealType === t.id ? 'bg-[#7B61FF]/5 border-[#7B61FF] text-[#7B61FF]' : 'bg-slate-50 border-transparent text-slate-400'}`}
              >
                <span className="text-lg">{t.icon}</span>
                <span className="text-[10px] font-black uppercase">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 space-y-6">
            
            {/* friendly measures carousel */}
            <div className="flex bg-slate-200/50 p-1 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
              <div className="flex gap-1 min-w-full">
                {meal.serving_size_g && (
                  <button 
                    onClick={() => { setEditUnit('serving'); setEditAmount(1); }}
                    className={`shrink-0 px-4 py-2 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all ${
                      editUnit === 'serving' ? 'bg-white text-[#7B61FF] shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    {meal.serving_unit || 'Porción'}
                  </button>
                )}
                {friendlyMeasures.map(m => (
                  <button 
                    key={m.name}
                    onClick={() => { setEditUnit(m.name); setEditAmount(1); }}
                    className={`shrink-0 px-4 py-2 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all ${
                      editUnit === m.name ? 'bg-white text-[#7B61FF] shadow-sm' : 'text-slate-400'
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
                  className={`shrink-0 px-4 py-2 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all ${
                    editUnit === 'base' ? 'bg-white text-[#7B61FF] shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Exacto ({meal.base_unit || 'g'})
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[14px] font-black text-slate-800 leading-tight">¿Cuánto has tomado?</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                  (Base: {meal.serving_size_g ? `${meal.serving_size_g}${meal.base_unit || 'g'}` : `100${meal.base_unit || 'g'}`})
                </span>
              </div>
              <div className={`flex items-center gap-2 bg-white transition-all shadow-sm border border-slate-200 focus-within:border-[#7B61FF] ${editUnit === 'base' ? 'px-4 py-3 rounded-2xl' : 'px-2 py-1.5 rounded-2xl'}`}>
                {editUnit !== 'base' && (
                  <button
                    onClick={() => setEditAmount((prev) => Math.max(0, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl transition-all hover:bg-[#7B61FF]/5 hover:text-[#7B61FF] active:scale-90"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                  </button>
                )}
                <div className="flex items-baseline gap-1">
                  <input type="number" step="any" className={`bg-transparent text-right font-black text-[#7B61FF] outline-none ${editUnit === 'base' ? 'text-2xl w-20' : 'text-xl w-12 text-center'}`} value={editAmount} onChange={e => setEditAmount(Number(e.target.value) || 0)} />
                  {editUnit === 'base' && <span className="text-xs font-bold text-slate-300 uppercase">{meal.base_unit || 'g'}</span>}
                </div>
                {editUnit !== 'base' && (
                  <button
                    onClick={() => setEditAmount((prev) => prev + 1)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl transition-all hover:bg-[#7B61FF]/5 hover:text-[#7B61FF] active:scale-90"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Energía Total</span>
              <span className="text-2xl font-black text-[#5BC897]">
                {Math.round((meal.base_calories || (meal.calories / (meal.serving_size_g || 100) * 100)) * currentRatio)} kcal
              </span>
            </div>
          </div>

          {editUnit !== 'base' && (
            <div className="text-center -mt-2 mb-4">
              <span className="text-[10px] font-bold text-slate-400">
                Total: <strong className="text-slate-600">{currentWeight.toFixed(0)}{meal.base_unit || 'g'}</strong> ({editAmount} {editUnit === 'serving' ? (meal.serving_unit || 'porción') : editUnit}{editAmount !== 1 ? 's' : ''})
              </span>
            </div>
          )}

          {/* Macros Preview */}
          <div className="grid grid-cols-3 gap-3">
             <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100/50 text-center">
               <p className="text-[9px] font-bold text-blue-400 uppercase">Proteínas</p>
               <p className="text-base font-black text-blue-600">{( (meal.base_protein || 0) * currentRatio).toFixed(1)}g</p>
             </div>
             <div className="bg-green-50/50 rounded-2xl p-3 border border-green-100/50 text-center">
               <p className="text-[9px] font-bold text-green-400 uppercase">Carbos</p>
               <p className="text-base font-black text-green-600">{( (meal.base_carbs || 0) * currentRatio).toFixed(1)}g</p>
             </div>
             <div className="bg-orange-50/50 rounded-2xl p-3 border border-orange-100/50 text-center">
               <p className="text-[9px] font-bold text-orange-400 uppercase">Grasas</p>
               <p className="text-base font-black text-orange-600">{( (meal.base_fats || 0) * currentRatio).toFixed(1)}g</p>
             </div>
          </div>
        </div>

        <div className="p-6">
          <button onClick={handleUpdate} disabled={isUpdating} className="w-full bg-[#7B61FF] hover:bg-[#684DEC] text-white rounded-3xl py-5 text-lg font-black shadow-xl shadow-purple-200 transition-all active:scale-[0.98] disabled:opacity-50">
            {isUpdating ? 'Actualizando...' : 'Guardar Cambios 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}
