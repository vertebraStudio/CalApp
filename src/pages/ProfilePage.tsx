import { useState, useEffect, useMemo } from 'react'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useWeightHistory, useAddWeightEntry } from '@/hooks/useWeightHistory'
import { useAuth } from '@/context/AuthContext'
import type { Profile } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const GENDERS: { id: Profile['gender']; label: string; icon: string }[] = [
  { id: 'Masculino', label: 'Masculino', icon: '👨' },
  { id: 'Femenino', label: 'Femenino', icon: '👩' },
  { id: 'Otro', label: 'Otro', icon: '👤' },
]

const ACTIVITY_LEVELS: { id: Profile['activity_level']; label: string; desc: string; icon: string }[] = [
  { id: 'Sedentario', label: 'Sedentario', desc: 'Poco o nada de ejercicio', icon: '🪑' },
  { id: 'Ligero', label: 'Ligero', desc: 'Ejercicio 1-3 días/sem', icon: '🚶' },
  { id: 'Moderado', label: 'Moderado', desc: 'Ejercicio 3-5 días/sem', icon: '🏃' },
  { id: 'Muy Activo', label: 'Muy Activo', desc: 'Ejercicio 6-7 días/sem', icon: '🏋️' },
  { id: 'Atleta', label: 'Atleta', desc: 'Entrenamiento profesional', icon: '🔥' },
]

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const { data: weightHistory = [] } = useWeightHistory()
  const addWeightEntry = useAddWeightEntry()

  const [username, setUsername] = useState('')
  const [goalCalories, setGoalCalories] = useState(2000)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Profile['gender']>('Otro')
  const [activity, setActivity] = useState<Profile['activity_level']>('Moderado')
  const [goalType, setGoalType] = useState<Profile['goal_type']>('Mantener Peso')
  const [goalIntensity, setGoalIntensity] = useState<Profile['goal_intensity']>('Moderado')
  const [macroP, setMacroP] = useState(30)
  const [macroC, setMacroC] = useState(40)
  const [macroF, setMacroF] = useState(30)
  const [waterGoal, setWaterGoal] = useState(2.0)
  const [weightChanged, setWeightChanged] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Datos formateados para la gráfica
  const chartData = useMemo(() => {
    return weightHistory.map(entry => ({
      fecha: new Date(entry.recorded_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      peso: entry.weight
    }))
  }, [weightHistory])

  // Calificación de calorías automáticas (Mifflin-St Jeor)
  const calculatedCalories = useMemo(() => {
    const w = parseFloat(weight)
    const h = parseFloat(height)
    const a = parseInt(age)
    if (!w || !h || !a || !gender) return 2000

    // BMR
    let bmr = (10 * w) + (6.25 * h) - (5 * a)
    if (gender === 'Masculino') bmr += 5
    else if (gender === 'Femenino') bmr -= 161
    else bmr -= 78

    // TDEE (Activity multiplier)
    const multipliers = { 'Sedentario': 1.2, 'Ligero': 1.375, 'Moderado': 1.55, 'Muy Activo': 1.725, 'Atleta': 1.9 }
    const tdee = bmr * (multipliers[activity as keyof typeof multipliers] || 1.55)

    // Goal Offset
    const offsets: Record<string, Record<string, number>> = {
      'Perder Grasa': { 'Estándar': -300, 'Moderado': -500, 'Agresivo': -750 },
      'Mantener Peso': { 'Estándar': 0, 'Moderado': 0, 'Agresivo': 0 },
      'Ganar Músculo': { 'Estándar': 200, 'Moderado': 400, 'Agresivo': 600 }
    }
    
    const result = Math.round(tdee + (offsets[goalType as any]?.[goalIntensity as any] || 0))
    return Math.max(1200, result)
  }, [weight, height, age, gender, activity, goalType, goalIntensity])

  // Cálculo de IMC y Progreso
  const healthKPIs = useMemo(() => {
    const w = parseFloat(weight)
    const h = parseFloat(height) / 100 // cm a m
    const bmi = w && h ? (w / (h * h)).toFixed(1) : '--'
    
    // Progreso: Comparar primer peso vs actual (simplificado)
    let progress = 0
    if (weightHistory.length > 1) {
      const startWeight = weightHistory[0].weight
      const currentWeight = w
      const diff = Math.abs(startWeight - currentWeight)
      // Estimación: 5kg como hito para el 100% en esta fase
      progress = Math.min(100, Math.round((diff / 5) * 100))
    }

    return { bmi, progress }
  }, [weight, height, weightHistory])

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '')
      setGoalCalories(profile.goal_calories || 2000)
      setWeight(profile.weight?.toString() ?? '')
      setHeight(profile.height?.toString() ?? '')
      setAge(profile.age?.toString() ?? '')
      setGender(profile.gender ?? 'Otro')
      setActivity(profile.activity_level ?? 'Moderado')
      setGoalType(profile.goal_type ?? 'Mantener Peso')
      setGoalIntensity(profile.goal_intensity ?? 'Moderado')
      setMacroP(profile.macro_p_pct ?? 30)
      setMacroC(profile.macro_c_pct ?? 40)
      setMacroF(profile.macro_f_pct ?? 30)
      setWaterGoal(profile.water_goal_liters || 2.0)
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    // Validar que los macros sumen 100%
    if (macroP + macroC + macroF !== 100) {
      alert("Los porcentajes de macros deben sumar exactamente 100%")
      return
    }

    try {
      const currentWeight = parseFloat(weight)

      await update.mutateAsync({
        username,
        goal_calories: goalCalories,
        weight: currentWeight || (undefined as any),
        height: height ? parseFloat(height) : (undefined as any),
        age: age ? parseInt(age) : undefined,
        gender,
        activity_level: activity,
        goal_type: goalType,
        goal_intensity: goalIntensity,
        macro_p_pct: macroP,
        macro_c_pct: macroC,
        macro_f_pct: macroF,
        water_goal_liters: waterGoal
      })

      // Si el peso ha sido modificado, registrarlo en el historial
      if (currentWeight) {
        await addWeightEntry.mutateAsync(currentWeight)
      }

      setWeightChanged(false)
      setIsEditing(false)
    } catch (err) {
      console.error("Error saving profile:", err)
    }
  }

  // Sincronizar meta calórica al cambiar parámetros
  const useCalculated = () => {
    setGoalCalories(calculatedCalories)
    setWeightChanged(false)
  }

  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#F8F9FE] -mx-4 -mt-6 px-6 pt-8 pb-32 animate-fadeIn text-slate-800 tracking-tight">
      
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Summary Card - Clickable Trigger */}
        <div 
          onClick={() => !isEditing && setIsEditing(true)}
          className={`bg-white rounded-[40px] p-8 shadow-xl border border-slate-100 relative overflow-hidden group transition-all duration-500 cursor-pointer ${isEditing ? 'shadow-purple-100 ring-2 ring-[#7B61FF]/20 mt-4' : 'hover:shadow-2xl hover:-translate-y-1 shadow-slate-200/50'}`}
        >
          {/* Background Decoration */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#7B61FF]/5 rounded-full blur-3xl group-hover:bg-[#7B61FF]/10 transition-colors" />
          
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); isEditing ? (document.getElementById('profile-form') as HTMLFormElement)?.requestSubmit() : setIsEditing(true) }}
            className={`absolute top-6 right-6 px-5 py-2.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all z-10 shadow-sm ${isEditing ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-[#7B61FF]/10 hover:text-[#7B61FF]'}`}
          >
            {isEditing ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Guardar
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Editar
              </>
            )}
          </button>

          <div className="flex flex-col items-center">
            <div className={`rounded-[32px] bg-slate-50 flex items-center justify-center relative shadow-inner transition-all duration-500 ${isEditing ? 'w-16 h-16 text-3xl mb-3' : 'w-24 h-24 text-5xl mb-4'}`}>
               {GENDERS.find(g => g.id === gender)?.icon || '👤'}
            </div>
            <h1 className={`${isEditing ? 'text-lg' : 'text-2xl'} font-black text-slate-800 tracking-tighter transition-all duration-500`}>{username || 'Usuario Gordito'}</h1>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">{user?.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-50 flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl">⚖️</div>
               <div>
                 <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Peso Actual</p>
                 <div className="flex items-baseline gap-0.5">
                   <span className="text-xl font-black text-slate-800 tracking-tight">{weight || '--'}</span>
                   <span className="text-[10px] font-bold text-slate-400">kg</span>
                 </div>
               </div>
            </div>
            <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-50 flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-xl">🎯</div>
               <div>
                 <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Objetivo</p>
                 <p className="text-[11px] font-black text-[#7B61FF] tracking-tight truncate max-w-[70px]">{goalType || 'Mantener'}</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50/30 rounded-3xl p-4 border border-blue-50/50 flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-xl">🧬</div>
               <div>
                 <p className="text-[8px] font-black text-blue-300 uppercase tracking-widest">IMC</p>
                 <span className="text-xl font-black text-blue-600 tracking-tight">{healthKPIs.bmi}</span>
               </div>
            </div>
            <div className="bg-rose-50/30 rounded-3xl p-4 border border-rose-50/50 flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-xl">🔥</div>
               <div>
                 <p className="text-[8px] font-black text-rose-300 uppercase tracking-widest">Progreso</p>
                 <span className="text-xl font-black text-rose-600 tracking-tight">{healthKPIs.progress}%</span>
               </div>
            </div>
          </div>

          {!isEditing && (
            <div className="mt-4 bg-[#7B61FF] rounded-3xl p-6 text-white shadow-lg shadow-[#7B61FF]/20 flex items-center justify-between animate-fadeIn">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Tu Meta Diaria</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tighter">{goalCalories}</span>
                  <span className="text-xs font-bold opacity-80">kcal</span>
                </div>
              </div>
              <div className="flex -space-x-2">
                 <div className="w-10 h-10 rounded-full border-4 border-[#7B61FF] bg-white/20 flex items-center justify-center text-xs font-black">P</div>
                 <div className="w-10 h-10 rounded-full border-4 border-[#7B61FF] bg-white/40 flex items-center justify-center text-xs font-black">C</div>
                 <div className="w-10 h-10 rounded-full border-4 border-[#7B61FF] bg-white/60 flex items-center justify-center text-xs font-black">F</div>
              </div>
            </div>
          )}
        </div>

        {/* Expansion Content (Accordion) */}
        <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isEditing ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <form id="profile-form" onSubmit={handleSave} className="space-y-6 pt-2 pb-10">
            {/* Card: Datos Básicos */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-lg">📝</div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Nombre</h2>
              </div>
              <input type="text" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#7B61FF]/20 focus:bg-white text-slate-800 px-5 py-3.5 rounded-2xl font-bold outline-none" value={username} onChange={e => setUsername(e.target.value)} />
              <div className="grid grid-cols-3 gap-3">
                {GENDERS.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGender(g.id)} className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all border-2 ${gender === g.id ? 'bg-[#7B61FF]/5 border-[#7B61FF] text-[#7B61FF]' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}><span className="text-xl">{g.icon}</span><span className="text-[10px] font-black uppercase">{g.label}</span></button>
                ))}
              </div>
            </div>

            {/* Card: Biometría */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">📏</div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Biometría</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase text-center">Edad</label><input type="number" className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-200 text-slate-800 p-4 rounded-2xl font-black text-center text-lg outline-none" value={age} onChange={e => setAge(e.target.value)} /></div>
                <div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase text-center">Peso</label><input type="number" step="0.1" className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-200 text-slate-800 p-4 rounded-2xl font-black text-center text-lg outline-none" value={weight} onChange={e => {setWeight(e.target.value); setWeightChanged(true)}} /></div>
                <div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase text-center">Altura</label><input type="number" className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-200 text-slate-800 p-4 rounded-2xl font-black text-center text-lg outline-none" value={height} onChange={e => setHeight(e.target.value)} /></div>
              </div>
            </div>

            {/* Card: Metas & Actividad */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-lg">🎯</div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Mi Objetivo</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {['Perder Grasa', 'Mantener Peso', 'Ganar Músculo'].map((type) => (
                    <button key={type} type="button" onClick={() => setGoalType(type as any)} className={`py-3 px-1 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border-2 ${goalType === type ? 'bg-[#7B61FF]/5 border-[#7B61FF] text-[#7B61FF]' : 'bg-slate-50 border-transparent text-slate-400'}`}>{type}</button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Estándar', 'Moderado', 'Agresivo'].map((intensity) => (
                    <button key={intensity} type="button" onClick={() => setGoalIntensity(intensity as any)} className={`py-3 px-1 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border-2 ${goalIntensity === intensity ? 'bg-amber-500 border-transparent text-white shadow-md shadow-amber-200' : 'bg-slate-50 border-transparent text-slate-400'}`}>{intensity}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-lg">💧</div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Meta de Agua</h2>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1.5, 2.0, 2.5, 3.0].map((liters) => (
                    <button 
                      key={liters} 
                      type="button" 
                      onClick={() => setWaterGoal(liters)} 
                      className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 ${waterGoal === liters ? 'bg-sky-500 border-transparent text-white shadow-md shadow-sky-200 scale-[1.02]' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                      {liters.toFixed(1)}L
                    </button>
                  ))}
                </div>
                <input 
                  type="number" 
                  step="0.1" 
                  className="mt-3 w-full bg-slate-50 border-2 border-transparent focus:border-sky-200 text-slate-800 p-3 rounded-xl font-black text-center text-sm outline-none" 
                  value={waterGoal} 
                  onChange={e => setWaterGoal(Number(e.target.value))} 
                  placeholder="Personalizado (L)"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-lg">⚡</div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Actividad</h2>
                </div>
                <div className="space-y-3">
                  {ACTIVITY_LEVELS.slice(0, 3).map((level) => (
                    <button key={level.id} type="button" onClick={() => setActivity(level.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border-2 ${activity === level.id ? 'bg-[#7B61FF]/5 border-[#7B61FF]' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm">{level.icon}</div>
                      <div className="text-left flex-1"><p className={`text-xs font-black uppercase ${activity === level.id ? 'text-[#7B61FF]' : 'text-slate-800'}`}>{level.label}</p></div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Ajuste de Calorías</h2>
                   <button type="button" onClick={useCalculated} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${weightChanged ? 'bg-orange-500 text-white animate-pulse shadow-lg shadow-orange-200' : 'bg-[#7B61FF]/5 text-[#7B61FF] hover:bg-[#7B61FF]/10'}`}>{weightChanged ? 'Recalcular' : 'Cargar IA'}</button>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex-1">
                      <div className="flex items-baseline gap-1"><span className="text-4xl font-black text-slate-800 tracking-tighter">{calculatedCalories}</span><span className="text-xs font-bold text-slate-400">kcal</span></div>
                   </div>
                   <div className="w-24"><input type="number" className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-200 text-slate-800 p-2.5 rounded-xl font-black text-center text-sm outline-none" value={goalCalories} onChange={e => setGoalCalories(Number(e.target.value))} /></div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={update.isPending} 
              onClick={(e) => e.stopPropagation()} 
              className="w-full py-5 rounded-3xl bg-[#7B61FF] text-white text-lg font-black transition-all active:scale-[0.98] shadow-xl shadow-purple-200 flex items-center justify-center gap-3"
            >
              {update.isPending ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" /> : <>Guardar Cambios</>}
            </button>
          </form>
        </div>

        {/* Weight Chart (Summary View) - Re-inserted here */}
        {!isEditing && chartData.length > 1 && (
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 overflow-hidden animate-fadeIn">
             <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-lg">📈</div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Evolución</h2>
              </div>
            </div>
            <div className="h-40 w-full -ml-8">
              <ResponsiveContainer width="110%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" hide />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: '900' }} />
                  <Line type="monotone" dataKey="peso" stroke="#3b82f6" strokeWidth={4} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Account Management & Support */}
        <div className="pt-4 space-y-2">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="h-[1px] flex-1 bg-slate-100"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Ajustes de Cuenta</span>
            <div className="h-[1px] flex-1 bg-slate-100"></div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
            <button className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
              <span className="flex-1 text-left text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-800 transition-colors">Cambiar Contraseña</span>
              <svg className="w-4 h-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
            
            <div className="h-[1px] bg-slate-50 mx-6"></div>

            <button 
              onClick={() => signOut()}
              className="w-full p-5 flex items-center gap-4 hover:bg-red-50 transition-colors group"
            >
              <span className="flex-1 text-left text-[11px] font-black uppercase tracking-widest text-red-400 group-hover:text-red-500 transition-colors">Cerrar Sesión</span>
              <svg className="w-4 h-4 text-red-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="pt-6 text-center">
            {/* Navigated via Navbar */}
          </div>
        </div>
      </div>
    </div>
  )
}
