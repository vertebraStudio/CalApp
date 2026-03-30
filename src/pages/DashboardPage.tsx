import { useState, useMemo } from 'react'
import { useMeals, useDeleteMeal } from '@/hooks/useMeals'
import { useProfile } from '@/hooks/useProfile'
import MealCard from '@/components/MealCard'
import DaySelector from '@/components/DaySelector'
import type { MealType } from '@/types'

const TODAY_ISO = new Date().toISOString().slice(0, 10)

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Desayuno', icon: '🍳' },
  { id: 'lunch', label: 'Comida', icon: '🥗' },
  { id: 'snack', label: 'Merienda', icon: '🍎' },
  { id: 'dinner', label: 'Cena', icon: '🍲' },
]

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(TODAY_ISO)
  const { data: meals = [], isLoading } = useMeals(selectedDate)
  const { data: profile } = useProfile()
  const deleteMeal = useDeleteMeal()

  // Cálculos de nutrición
  const totals = useMemo(() => meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + Number(m.protein),
      carbs: acc.carbs + Number(m.carbs),
      fats: acc.fats + Number(m.fats),
      sugar: acc.sugar + Number(m.sugar ?? 0),
      salt: acc.salt + Number(m.salt ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, salt: 0 }
  ), [meals])

  // Agrupar comidas
  const mealsByType = useMemo(() => {
    const groups: Record<MealType, any[]> = {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
    }
    meals.forEach(m => {
      if (groups[m.meal_type]) groups[m.meal_type].push(m)
    })
    return groups
  }, [meals])

  const goalCalories = profile?.goal_calories ?? 2000

  // Objetivos de macros dinámicos basados en porcentajes de perfil
  const macroGoals = useMemo(() => {
    const pPct = profile?.macro_p_pct ?? 30
    const cPct = profile?.macro_c_pct ?? 40
    const fPct = profile?.macro_f_pct ?? 30
    
    return {
      protein: Math.round((goalCalories * (pPct / 100)) / 4),
      carbs: Math.round((goalCalories * (cPct / 100)) / 4),
      fats: Math.round((goalCalories * (fPct / 100)) / 9),
      sugar: Math.round((goalCalories * 0.05) / 4), // Máximo 5% de kcal en azúcar
      salt: Number((goalCalories / 400).toFixed(1)) // Aprox 5g para 2000kcal
    }
  }, [profile, goalCalories])

  return (
    <div className="min-h-screen bg-[#F8F9FE] -mx-4 -mt-6 px-4 pt-4 pb-32 text-slate-800 font-sans tracking-tight">
      {/* Header & Day Selector */}
      <DaySelector selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div className="mt-4 space-y-6">
        {/* Compact Single-Card Nutrition Summary */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Calorías consumidas</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-800 tracking-tighter">{totals.calories}</span>
                <span className="text-xs font-bold text-slate-400">/ {goalCalories} kcal</span>
              </div>
            </div>
            <div className="relative w-16 h-16">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#7B61FF]" strokeWidth="4" 
                   strokeDasharray={`${Math.min(100, (totals.calories / goalCalories) * 100)} 100`} 
                   strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-[10px] font-black text-[#7B61FF]">{Math.round((totals.calories/goalCalories)*100)}%</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-50">
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Proteínas</p>
              <p className="text-base font-black text-slate-800">{Math.round(totals.protein)}<span className="text-[10px] text-slate-400 font-bold ml-0.5">/{macroGoals.protein}g</span></p>
              <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-[#FFA061] rounded-full" style={{ width: `${Math.min(100, (totals.protein / macroGoals.protein) * 100)}%` }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Carbos</p>
              <p className="text-base font-black text-slate-800">{Math.round(totals.carbs)}<span className="text-[10px] text-slate-400 font-bold ml-0.5">/{macroGoals.carbs}g</span></p>
              <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-[#FFCD4B] rounded-full" style={{ width: `${Math.min(100, (totals.carbs / macroGoals.carbs) * 100)}%` }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Grasas</p>
              <p className="text-base font-black text-slate-800">{Math.round(totals.fats)}<span className="text-[10px] text-slate-400 font-bold ml-0.5">/{macroGoals.fats}g</span></p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#4BB3FF] rounded-full" style={{ width: `${Math.min(100, (totals.fats / macroGoals.fats) * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Sugar & Salt trackers */}
          <div className="grid grid-cols-2 gap-4 pt-5 border-t border-slate-50">
            {/* Sugar */}
            {(() => {
              const SUGAR_MAX = macroGoals.sugar
              const pct = Math.min(100, (totals.sugar / SUGAR_MAX) * 100)
              const isWarning = totals.sugar >= SUGAR_MAX * 0.8
              const isOver = totals.sugar >= SUGAR_MAX
              const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-orange-400' : 'bg-pink-400'
              const textColor = isOver ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-slate-800'
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 tracking-wider">
                      🍬 Azúcares
                      {isWarning && <span className="text-[10px]">⚠️</span>}
                    </p>
                    <p className={`text-xs font-black ${textColor}`}>{Math.round(totals.sugar)}<span className="text-[9px] text-slate-400 font-bold">/{SUGAR_MAX}g</span></p>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}
            {/* Salt */}
            {(() => {
              const SALT_MAX = macroGoals.salt
              const pct = Math.min(100, (totals.salt / SALT_MAX) * 100)
              const isWarning = totals.salt >= SALT_MAX * 0.8
              const isOver = totals.salt >= SALT_MAX
              const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-orange-400' : 'bg-slate-400'
              const textColor = isOver ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-slate-800'
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 tracking-wider">
                      🧂 Sal
                      {isWarning && <span className="text-[10px]">⚠️</span>}
                    </p>
                    <p className={`text-xs font-black ${textColor}`}>{totals.salt.toFixed(1)}<span className="text-[9px] text-slate-400 font-bold">/{SALT_MAX}g</span></p>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Categorized Meal List */}
        <div className="space-y-8 mt-8">
           {MEAL_TYPES.map((type) => {
             const groupMeals = mealsByType[type.id]
             return (
               <section key={type.id} className="space-y-3">
                 <div className="flex items-center gap-2 px-1">
                   <span className="text-lg">{type.icon}</span>
                   <h3 className="text-sm font-black text-slate-800 tracking-tight flex-1">
                     {type.label}
                   </h3>
                   {groupMeals.length > 0 && (
                     <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                       {groupMeals.reduce((s, m) => s + m.calories, 0)} kcal
                     </span>
                   )}
                 </div>
                 
                 <div className="space-y-2">
                   {groupMeals.length > 0 ? (
                     groupMeals.map(meal => (
                       <MealCard key={meal.id} meal={meal} onDelete={() => deleteMeal.mutate(meal.id)} />
                     ))
                   ) : (
                     <div className="h-14 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-[11px] text-slate-300 font-bold bg-white/50">
                        No hay registros
                     </div>
                   )}
                 </div>
               </section>
             )
           })}
        </div>

        {isLoading && (
          <div className="text-center py-8 text-slate-400 text-sm">Cargando datos...</div>
        )}
      </div>
    </div>
  )
}
