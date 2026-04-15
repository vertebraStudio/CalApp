import { useState, useMemo } from 'react'
import { useMeals, useDeleteMeal } from '@/hooks/useMeals'
import { useProfile } from '@/hooks/useProfile'
import { useWater, useUpdateWater } from '@/hooks/useWater'
import { useUpdateMeal } from '@/hooks/useUpdateMeal'
import MealCard from '@/components/MealCard'
import DaySelector from '@/components/DaySelector'
import EditMealModal from '@/components/EditMealModal'
import type { MealType, Meal } from '@/types'

const TODAY_ISO = new Date().toISOString().slice(0, 10)

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Desayuno', icon: '🍳' },
  { id: 'lunch', label: 'Comida', icon: '🥗' },
  { id: 'snack', label: 'Snacks', icon: '🍎' },
  { id: 'dinner', label: 'Cena', icon: '🍲' },
]

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(TODAY_ISO)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const { data: meals = [], isLoading } = useMeals(selectedDate)
  const { data: profile } = useProfile()
  const { data: waterData } = useWater(selectedDate)
  const deleteMeal = useDeleteMeal()
  const updateWater = useUpdateWater()
  const { updateMeal, isUpdating } = useUpdateMeal()

  // State for collapsible modules
  const [collapsedSections, setCollapsedSections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gordito_collapsed_sections')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const isCollapsed = prev.includes(id)
      const next = isCollapsed ? prev.filter(s => s !== id) : [...prev, id]
      localStorage.setItem('gordito_collapsed_sections', JSON.stringify(next))
      return next
    })
  }

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
      sugar: Math.round((goalCalories * 0.05) / 4),
      salt: Number((goalCalories / 400).toFixed(1))
    }
  }, [profile, goalCalories])


  return (
    <div className="pb-32 text-slate-800 font-sans tracking-tight">
      <DaySelector selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div className="mt-4 space-y-6">
        {/* Compact Single-Card Nutrition Summary */}
        <div className={`bg-white rounded-[32px] border-2 border-black overflow-hidden transition-all duration-300 ${
          collapsedSections.includes('nutrition') ? 'shadow-none' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
        }`}>
          <button 
            onClick={() => toggleSection('nutrition')}
            className="w-full flex items-center justify-between p-6 transition-colors text-left"
          >
            <div className="flex items-center justify-between flex-1 pr-4">
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
                     strokeLinecap="round" opacity={totals.calories > goalCalories ? 0.3 : 1} />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <span className={`text-[10px] font-black ${totals.calories > goalCalories ? 'text-red-500' : 'text-[#7B61FF]'}`}>
                    {Math.round((totals.calories/goalCalories)*100)}%
                   </span>
                 </div>
              </div>
            </div>
            
            <div className={`p-2 rounded-xl border-[1.5px] border-black transition-all duration-300 ${
              collapsedSections.includes('nutrition') 
                ? 'bg-[#7B61FF] text-white -rotate-180' 
                : 'bg-[#FFF156] text-black'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </button>

          {!collapsedSections.includes('nutrition') && (
            <div className="px-6 pb-6 pt-0 animate-fadeIn space-y-6">
              <div className="grid grid-cols-3 gap-2 pt-6 border-t border-slate-50">
            {/* Protein */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Proteínas</p>
              <div className="relative w-14 h-14">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#FFA061]" strokeWidth="4" 
                    strokeDasharray={`${Math.min(100, (totals.protein / macroGoals.protein) * 100)} 100`} 
                    strokeLinecap="round" opacity={totals.protein > macroGoals.protein ? 0.3 : 1} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[12px] font-black leading-none ${totals.protein > macroGoals.protein ? 'text-red-500' : 'text-slate-800'}`}>
                    {Math.round(totals.protein)}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                  {Math.round(totals.protein)}<span className="text-slate-300 mx-1">/</span>{macroGoals.protein}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                </p>
              </div>
            </div>

            {/* Carbs */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Carbos</p>
              <div className="relative w-14 h-14">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#FFCD4B]" strokeWidth="4" 
                    strokeDasharray={`${Math.min(100, (totals.carbs / macroGoals.carbs) * 100)} 100`} 
                    strokeLinecap="round" opacity={totals.carbs > macroGoals.carbs ? 0.3 : 1} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[12px] font-black leading-none ${totals.carbs > macroGoals.carbs ? 'text-red-500' : 'text-slate-800'}`}>
                    {Math.round(totals.carbs)}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                  {Math.round(totals.carbs)}<span className="text-slate-300 mx-1">/</span>{macroGoals.carbs}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                </p>
              </div>
            </div>

            {/* Fats */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Grasas</p>
              <div className="relative w-14 h-14">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#4BB3FF]" strokeWidth="4" 
                    strokeDasharray={`${Math.min(100, (totals.fats / macroGoals.fats) * 100)} 100`} 
                    strokeLinecap="round" opacity={totals.fats > macroGoals.fats ? 0.3 : 1} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[12px] font-black leading-none ${totals.fats > macroGoals.fats ? 'text-red-500' : 'text-slate-800'}`}>
                    {Math.round(totals.fats)}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                  {Math.round(totals.fats)}<span className="text-slate-300 mx-1">/</span>{macroGoals.fats}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-8 border-t border-slate-50">
            {/* Sugar */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">🍬 Azúcares</p>
              <div className="relative w-14 h-14">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#F472B6" strokeWidth="4" 
                    strokeDasharray={`${Math.min(100, (totals.sugar / macroGoals.sugar) * 100)} 100`} 
                    strokeLinecap="round" opacity={totals.sugar > macroGoals.sugar ? 0.3 : 1} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[12px] font-black leading-none ${totals.sugar > macroGoals.sugar ? 'text-red-600' : 'text-slate-800'}`}>
                    {Math.round(totals.sugar)}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                  {Math.round(totals.sugar)}<span className="text-slate-300 mx-1">/</span>{macroGoals.sugar}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                </p>
              </div>
            </div>

            {/* Salt */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">🧂 Sal</p>
              <div className="relative w-14 h-14">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#94A3B8" strokeWidth="4" 
                    strokeDasharray={`${Math.min(100, (totals.salt / macroGoals.salt) * 100)} 100`} 
                    strokeLinecap="round" opacity={totals.salt > macroGoals.salt ? 0.3 : 1} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[12px] font-black leading-none ${totals.salt > macroGoals.salt ? 'text-red-600' : 'text-slate-800'}`}>
                    {totals.salt.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                  {totals.salt.toFixed(1)}<span className="text-slate-300 mx-1">/</span>{macroGoals.salt.toFixed(1)}<span className="text-[8px] text-slate-400 font-bold ml-0.5">g</span>
                </p>
              </div>
            </div>

            {/* Water Shortcut Mini Progress */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">💧 Agua</p>
              <div className="relative w-14 h-14">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#0EA5E9" strokeWidth="4" 
                    strokeDasharray={`${Math.min(100, ((waterData?.ml_consumed || 0) / 1000 / (profile?.water_goal_liters || 2.0)) * 100)} 100`} 
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-black text-slate-800 leading-none">
                    {((waterData?.ml_consumed || 0) / 1000).toFixed(2)}L
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-800 tracking-tight leading-tight">
                  {((waterData?.ml_consumed || 0) / 1000).toFixed(2)}<span className="text-slate-300 mx-1">/</span>{(profile?.water_goal_liters || 2.0).toFixed(1)}<span className="text-[8px] text-slate-400 font-bold ml-0.5">L</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

        {/* Water Tracker Module */}
        <div className={`bg-white rounded-[32px] border-2 border-black overflow-hidden transition-all duration-300 ${
          collapsedSections.includes('water') ? 'shadow-none' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
        }`}>
          <button 
            onClick={() => toggleSection('water')}
            className="w-full flex items-center justify-between p-6 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="bg-sky-50 p-2 rounded-2xl">
                <span className="text-xl">💧</span>
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tighter">Hidratación</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {((waterData?.ml_consumed || 0) / 1000).toFixed(2)}L de {(profile?.water_goal_liters || 2.0).toFixed(1)}L
                </p>
              </div>
            </div>
            <div className={`p-2 rounded-xl border-[1.5px] border-black transition-all duration-300 ${
              collapsedSections.includes('water') 
                ? 'bg-[#7B61FF] text-white -rotate-180' 
                : 'bg-[#FFF156] text-black'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </button>

          {!collapsedSections.includes('water') && (
            <div className="px-6 pb-6 pt-0 flex flex-col gap-6 animate-fadeIn">
              <div className="grid grid-cols-4 gap-x-6 gap-y-8 justify-items-center py-2">
                {(() => {
                  const currentMl = waterData?.ml_consumed || 0
                  const currentGlasses = Math.floor(currentMl / 250)
                  const goalL = profile?.water_goal_liters || 2.0
                  const goalGlasses = Math.ceil(goalL / 0.25)
                  const totalToDisplay = Math.max(goalGlasses, currentGlasses + 1)
                  
                  return Array.from({ length: totalToDisplay }).map((_, i) => {
                    const isFull = i < currentGlasses
                    const isNext = i === currentGlasses
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          const newMl = isFull ? (currentGlasses - 1) * 250 : (currentGlasses + 1) * 250
                          updateWater.mutate({ date: selectedDate, ml: Math.max(0, newMl) })
                        }}
                        className="relative w-10 h-12 transition-all duration-300 transform active:scale-95 flex items-center justify-center group"
                      >
                        <div className="relative w-7 h-10">
                          <svg viewBox="0 0 24 32" className="w-full h-full drop-shadow-sm">
                            <defs>
                              <clipPath id={`water-clip-${i}`}>
                                <rect x="0" y={isFull ? "0" : "32"} width="24" height="32" className="transition-all duration-700 ease-out" />
                              </clipPath>
                            </defs>
                            <path d="M4 2 L20 2 L18 28 C17.8 30 16 31 14 31 L10 31 C8 31 6.2 30 6 28 L4 2 Z" fill={isFull ? '#E0F2FE' : '#F8FAFC'} stroke={isFull ? '#0EA5E9' : '#E2E8F0'} strokeWidth="1.5" className="transition-colors duration-500" />
                            <path d="M4 2 L20 2 L18 28 C17.8 30 16 31 14 31 L10 31 C8 31 6.2 30 6 28 L4 2 Z" fill="#0EA5E9" clipPath={`url(#water-clip-${i})`} className="transition-all duration-500" />
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
                  {((waterData?.ml_consumed || 0) / 1000).toFixed(2)}L registrados
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingMeal && (
          <EditMealModal 
            meal={editingMeal} 
            onClose={() => setEditingMeal(null)} 
            onUpdate={updateMeal}
            isUpdating={isUpdating}
          />
        )}

        <div className="space-y-4 mt-8">
           {MEAL_TYPES.map((type) => {
             const groupMeals = mealsByType[type.id]
             const isCollapsed = collapsedSections.includes(type.id)
             
             return (
               <section key={type.id} className={`bg-white rounded-[32px] border-2 border-black overflow-hidden transition-all duration-300 ${
                 isCollapsed ? 'shadow-none' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
               }`}>
                 <button 
                  onClick={() => toggleSection(type.id)}
                  className="w-full flex items-center justify-between p-5 transition-colors text-left"
                 >
                   <div className="flex items-center gap-3">
                     <div className="bg-slate-50 p-2 rounded-2xl">
                       <span className="text-xl">{type.icon}</span>
                     </div>
                     <h3 className="text-base font-black text-slate-800 tracking-tight">
                       {type.label}
                     </h3>
                   </div>
                   <div className="flex items-center gap-3">
                     {groupMeals.length > 0 && (
                       <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                         {groupMeals.reduce((s, m) => s + m.calories, 0)} kcal
                       </span>
                     )}
                     <div className={`p-2 rounded-xl border-[1.5px] border-black transition-all duration-300 ${
                       isCollapsed 
                         ? 'bg-[#7B61FF] text-white -rotate-180' 
                         : 'bg-[#FFF156] text-black'
                     }`}>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                   </div>
                 </button>

                 {!isCollapsed && (
                   <div className="px-5 pb-5 pt-0 space-y-2 animate-fadeIn border-t border-slate-50">
                     {groupMeals.length > 0 ? (
                       groupMeals.map(meal => (
                         <MealCard key={meal.id} meal={meal} onDelete={() => deleteMeal.mutate(meal.id)} onClick={() => setEditingMeal(meal)} />
                       ))
                     ) : (
                       <div className="h-14 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-[11px] text-slate-500 font-bold mt-2">No hay registros</div>
                     )}
                   </div>
                 )}
               </section>
             )
           })}
        </div>
        {isLoading && <div className="text-center py-8 text-slate-400 text-sm">Cargando datos...</div>}
      </div>
    </div>
  )
}
