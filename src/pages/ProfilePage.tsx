import { useState, useEffect, useMemo } from 'react'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useWeightHistory, useAddWeightEntry } from '@/hooks/useWeightHistory'
import { useAuth } from '@/context/AuthContext'
import type { Profile } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import PreferencesQuizModal, { QuizData } from '@/components/profile/PreferencesQuizModal'

const GENDERS: { id: Profile['gender']; label: string; icon: string }[] = [
  { id: 'Masculino', label: 'Masculino', icon: '👨' },
  { id: 'Femenino', label: 'Femenino', icon: '👩' },
  { id: 'Otro', label: 'Otro', icon: '👤' },
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

  const [isQuizOpen, setIsQuizOpen] = useState(false)

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

      // Auto-abrir modal de onboarding si falta información clave (como el peso)
      if (!profile.weight && !isQuizOpen) {
        setIsQuizOpen(true)
      }
    }
  }, [profile, isQuizOpen])



  const handleQuizSave = async (quizData: QuizData) => {
    console.log('Iniciando guardado de quiz...', quizData)
    try {
      const currentWeight = parseFloat(quizData.weight)

      // Calculate calories using Mifflin-St Jeor
      const w = currentWeight || 70
      const h = parseFloat(quizData.height) || 170
      const a = parseInt(quizData.age) || 30
      
      let bmr = 10 * w + 6.25 * h - 5 * a
      if (quizData.gender === 'Masculino') bmr += 5
      else if (quizData.gender === 'Femenino') bmr -= 161
      else bmr -= 78
      
      const multipliers: Record<string, number> = { Sedentario: 1.2, Ligero: 1.375, Moderado: 1.55, 'Muy Activo': 1.725, Atleta: 1.9 }
      const tdee = bmr * (multipliers[quizData.activity_level ?? 'Moderado'] ?? 1.55)
      const offsets: Record<string, Record<string, number>> = {
        'Perder Grasa': { Estándar: -300, Moderado: -500, Agresivo: -750 },
        'Mantener Peso': { Estándar: 0, Moderado: 0, Agresivo: 0 },
        'Ganar Músculo': { Estándar: 200, Moderado: 400, Agresivo: 600 },
      }
      
      const offset = offsets[quizData.goal_type ?? 'Mantener Peso']?.[quizData.goal_intensity ?? 'Moderado'] ?? 0
      const calculatedResult = Math.round(tdee + offset)
      const newCalories = isNaN(calculatedResult) ? 2000 : Math.max(1200, calculatedResult)

      // Update local state
      setGender(quizData.gender ?? 'Otro')
      setAge(quizData.age)
      setHeight(quizData.height)
      setWeight(quizData.weight)
      setGoalType(quizData.goal_type ?? 'Mantener Peso')
      setGoalIntensity(quizData.goal_intensity ?? 'Moderado')
      setActivity(quizData.activity_level ?? 'Moderado')
      setWaterGoal(quizData.water_goal_liters)
      setGoalCalories(newCalories)

      const finalUsername = username || user?.email?.split('@')[0] || 'Gordito'

      await update.mutateAsync({
        username: finalUsername,
        goal_calories: newCalories,
        weight: currentWeight || undefined,
        height: quizData.height ? parseFloat(quizData.height) : undefined,
        age: quizData.age ? parseInt(quizData.age) : undefined,
        gender: quizData.gender,
        activity_level: quizData.activity_level,
        goal_type: quizData.goal_type,
        goal_intensity: quizData.goal_intensity,
        macro_p_pct: macroP,
        macro_c_pct: macroC,
        macro_f_pct: macroF,
        water_goal_liters: quizData.water_goal_liters,
      })

      // Weight history is best-effort — don't block modal close if it fails
      if (currentWeight) {
        try {
          await addWeightEntry.mutateAsync(currentWeight)
        } catch (weightErr) {
          console.warn('Weight history save failed (non-blocking):', weightErr)
        }
      }

      console.log('Quiz guardado correctamente')
      setIsQuizOpen(false)
    } catch (err) {
      console.error('Error saving quiz preferences:', err)
      throw err // Re-lanzar para que el modal detecte el error
    }
  }

  // Sincronizar meta calórica al cambiar parámetros


  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#7B61FF] -mx-4 -mt-6 px-6 pt-8 pb-32 animate-fadeIn text-slate-800 tracking-tight">
      <PreferencesQuizModal
        preventClose={!profile?.weight}
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onSave={handleQuizSave}
        initialData={{
          gender,
          age,
          height,
          weight,
          goal_type: goalType,
          goal_intensity: goalIntensity,
          activity_level: activity,
          water_goal_liters: waterGoal,
        }}
      />

      <div className="space-y-6 max-w-lg mx-auto">
        {/* Summary Card */}
        <div 
          className="bg-white rounded-[32px] p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group transition-all duration-300"
        >
          {/* Background Decoration */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#7B61FF]/10 rounded-full blur-3xl transition-colors" />
          
          <button 
            type="button"
            onClick={() => setIsQuizOpen(true)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center transition-all z-10 bg-[#FFF156] text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>

          <div className="flex flex-col items-center">
            <div className="w-24 h-24 text-5xl mb-4 rounded-[32px] bg-slate-50 flex items-center justify-center relative border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
               {GENDERS.find(g => g.id === gender)?.icon || '👤'}
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{username || 'Usuario Gordito'}</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{user?.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-3xl p-4 border-2 border-black flex items-center gap-3">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Peso Actual</p>
                 <div className="flex items-baseline gap-0.5">
                   <span className="text-xl font-black text-slate-800 tracking-tight">{weight || '--'}</span>
                   <span className="text-[10px] font-bold text-slate-400">kg</span>
                 </div>
               </div>
            </div>
            <div className="bg-white rounded-3xl p-4 border-2 border-black flex items-center gap-3">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Objetivo</p>
                 <p className="text-[11px] font-black text-[#7B61FF] tracking-tight truncate max-w-[70px]">{goalType || 'Mantener'}</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-3xl p-4 border-2 border-black flex items-center gap-3">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IMC</p>
                 <span className="text-xl font-black text-slate-800 tracking-tight">{healthKPIs.bmi}</span>
               </div>
            </div>
            <div className="bg-white rounded-3xl p-4 border-2 border-black flex items-center gap-3">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progreso</p>
                 <span className="text-xl font-black text-slate-800 tracking-tight">{healthKPIs.progress}%</span>
               </div>
            </div>
          </div>

          <div className="mt-4 bg-[#7B61FF] rounded-[24px] p-6 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#FFF156] mb-1">Tu Meta Diaria</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tighter">{goalCalories}</span>
                <span className="text-xs font-bold opacity-80">kcal</span>
              </div>
            </div>
          </div>
        </div>



        {/* Weight Chart */}
        {chartData.length > 1 && (
          <div className="bg-white rounded-[32px] p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-fadeIn">
             <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF156] border-2 border-black flex items-center justify-center text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">📈</div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 ml-2">Evolución</h2>
              </div>
            </div>
            <div className="h-40 w-full -ml-8">
              <ResponsiveContainer width="110%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                  <XAxis dataKey="fecha" hide />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: '2px solid black', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', fontSize: '10px', fontWeight: '900' }} />
                  <Line type="monotone" dataKey="peso" stroke="#000000" strokeWidth={4} dot={{ fill: '#FFF156', strokeWidth: 3, r: 6, stroke: '#000000' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Account Management & Support */}
        <div className="pt-4 space-y-2">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="h-1 flex-1 bg-black/10 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Ajustes de Cuenta</span>
            <div className="h-1 flex-1 bg-black/10 rounded-full"></div>
          </div>

          <div className="bg-white rounded-[32px] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col divide-y-2 divide-black overflow-hidden">
            <button className="w-full p-5 flex items-center gap-4 hover:bg-[#FFF156] transition-colors group">
              <span className="flex-1 text-left text-[11px] font-black uppercase tracking-widest text-slate-800 transition-colors">Cambiar Contraseña</span>
              <div className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center bg-white group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>

            <button 
              onClick={() => signOut()}
              className="w-full p-5 flex items-center gap-4 hover:bg-[#FFA061] transition-colors group"
            >
              <span className="flex-1 text-left text-[11px] font-black uppercase tracking-widest text-black transition-colors">Cerrar Sesión</span>
              <div className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center bg-white group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
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

