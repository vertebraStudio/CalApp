import { useState, useMemo } from 'react'
import { useMeals, useDeleteMeal } from '@/hooks/useMeals'
import { useProfile } from '@/hooks/useProfile'
import { useWater, useUpdateWater } from '@/hooks/useWater'
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
  const { data: waterData } = useWater(selectedDate)
  const deleteMeal = useDeleteMeal()
  const updateWater = useUpdateWater()

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

          {/* Macros Circular Progress Section */}
          <div className="grid grid-cols-3 gap-2 pt-6 border-t border-slate-50">
            {/* Protein */}
            {(() => {
              const current = totals.protein
              const goal = macroGoals.protein
              const pct = Math.min(100, (current / goal) * 100)
              return (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Proteínas</p>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#FFA061]" strokeWidth="4" 
                        strokeDasharray={`${pct} 100`} 
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[12px] font-black text-slate-800 leading-none">{Math.round(current)}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                      {Math.round(current)}<span className="text-slate-300 mx-1">/</span>{goal}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Carbs */}
            {(() => {
              const current = totals.carbs
              const goal = macroGoals.carbs
              const pct = Math.min(100, (current / goal) * 100)
              return (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Carbos</p>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#FFCD4B]" strokeWidth="4" 
                        strokeDasharray={`${pct} 100`} 
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[12px] font-black text-slate-800 leading-none">{Math.round(current)}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                      {Math.round(current)}<span className="text-slate-300 mx-1">/</span>{goal}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Fats */}
            {(() => {
              const current = totals.fats
              const goal = macroGoals.fats
              const pct = Math.min(100, (current / goal) * 100)
              return (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Grasas</p>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#4BB3FF]" strokeWidth="4" 
                        strokeDasharray={`${pct} 100`} 
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[12px] font-black text-slate-800 leading-none">{Math.round(current)}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                      {Math.round(current)}<span className="text-slate-300 mx-1">/</span>{goal}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Sugar, Salt & Water Circular Progress Section */}
          <div className="grid grid-cols-3 gap-2 pt-8 border-t border-slate-50">
            {/* Sugar */}
            {(() => {
              const current = totals.sugar
              const max = macroGoals.sugar
              const pct = Math.min(100, (current / max) * 100)
              const isOver = current >= max
              const color = '#F472B6' // Always Pink
              
              return (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">🍬 Azúcares</p>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="4" 
                        strokeDasharray={`${pct} 100`} 
                        strokeLinecap="round" className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[12px] font-black leading-none ${isOver ? 'text-red-600' : 'text-slate-800'} transition-colors duration-300`}>
                        {Math.round(current)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                      {Math.round(current)}<span className="text-slate-300 mx-1">/</span>{max}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Salt */}
            {(() => {
              const current = totals.salt
              const max = macroGoals.salt
              const pct = Math.min(100, (current / max) * 100)
              const isOver = current >= max
              const color = '#94A3B8' // Always Slate
              
              return (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">🧂 Sal</p>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="4" 
                        strokeDasharray={`${pct} 100`} 
                        strokeLinecap="round" className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[12px] font-black leading-none ${isOver ? 'text-red-600' : 'text-slate-800'} transition-colors duration-300`}>
                        {current.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                      {current.toFixed(1)}<span className="text-slate-300 mx-1">/</span>{max.toFixed(1)}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Water */}
            {(() => {
              const currentMl = waterData?.ml_consumed || 0
              const currentL = currentMl / 1000
              const goalL = profile?.water_goal_liters || 2.0
              const pct = Math.min(100, (currentL / goalL) * 100)
              
              return (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">💧 Agua</p>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#0EA5E9" strokeWidth="4" 
                        strokeDasharray={`${pct} 100`} 
                        strokeLinecap="round" className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[11px] font-black text-slate-800 leading-none">
                        {currentL.toFixed(2)}<span className="text-[7px] text-slate-400 font-bold ml-0.5">L</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                      {currentL.toFixed(2)}<span className="text-slate-300 mx-1">/</span>{goalL.toFixed(1)}<span className="text-[8px] text-slate-400 font-bold ml-0.5">L</span>
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Water Tracker Module */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tighter">Hidratación</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registrar consumo de agua</p>
            </div>
            <div className="bg-sky-50 p-2 rounded-2xl">
              <span className="text-xl">💧</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-x-6 gap-y-8 justify-items-center py-2">
            {(() => {
              const currentMl = waterData?.ml_consumed || 0
              const currentGlasses = Math.floor(currentMl / 250)
              const goalL = profile?.water_goal_liters || 2.0
              const goalGlasses = Math.ceil(goalL / 0.25)
              
              // We show up to goalGlasses, or more if the user drank more
              const totalToDisplay = Math.max(goalGlasses, currentGlasses + 1)
              
              return Array.from({ length: totalToDisplay }).map((_, i) => {
                const isFull = i < currentGlasses
                const isNext = i === currentGlasses
                
                return (
                  <button
                    key={i}
                    onClick={() => {
                      // If clicking a full glass, we remove it. If empty, we add one.
                      const newMl = isFull ? (currentGlasses - 1) * 250 : (currentGlasses + 1) * 250
                      updateWater.mutate({ date: selectedDate, ml: Math.max(0, newMl) })
                    }}
                    className="relative w-10 h-12 transition-all duration-300 transform active:scale-95 flex items-center justify-center group"
                  >
                    {/* Glass SVG */}
                    <div className="relative w-7 h-10">
                      <svg viewBox="0 0 24 32" className="w-full h-full drop-shadow-sm">
                        {/* Define liquid clip path */}
                        <defs>
                          <clipPath id={`water-clip-${i}`}>
                            <rect 
                              x="0" 
                              y={isFull ? "0" : "32"} 
                              width="24" 
                              height="32" 
                              className="transition-all duration-700 ease-out" 
                            />
                          </clipPath>
                        </defs>
                        
                        {/* Glass Body / Water */}
                        <path 
                          d="M4 2 L20 2 L18 28 C17.8 30 16 31 14 31 L10 31 C8 31 6.2 30 6 28 L4 2 Z" 
                          fill={isFull ? '#E0F2FE' : '#F8FAFC'} 
                          stroke={isFull ? '#0EA5E9' : '#E2E8F0'} 
                          strokeWidth="1.5"
                          className="transition-colors duration-500"
                        />
                        
                        {/* Liquid inside - matches glass shape exactly using clipPath */}
                        <path 
                          d="M4 2 L20 2 L18 28 C17.8 30 16 31 14 31 L10 31 C8 31 6.2 30 6 28 L4 2 Z" 
                          fill="#0EA5E9"
                          clipPath={`url(#water-clip-${i})`}
                          className="transition-all duration-500"
                        />

                        {/* Reflections and Shine */}
                        <path d="M7 6 L7 24" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity={isFull ? "0.4" : "0.2"} />
                        <path d="M17 5 L18 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                      </svg>
                    </div>

                    {isNext && !isFull && (
                      <div className="absolute top-0 right-0">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-200 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-100"></span>
                        </span>
                      </div>
                    )}
                  </button>
                )
              })
            })()}
          </div>
          
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vaso = 250ml</span>
            <span className="text-[11px] font-black text-sky-600">
              {((waterData?.ml_consumed || 0) / 1000).toFixed(2)}L de { (profile?.water_goal_liters || 2.0).toFixed(1)}L
            </span>
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
