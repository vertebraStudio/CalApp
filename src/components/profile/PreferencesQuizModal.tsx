import React, { useState, useMemo, useEffect } from 'react'
import type { Profile } from '@/types'

export interface QuizData {
  gender: Profile['gender']
  age: string
  height: string
  weight: string
  goal_type: Profile['goal_type']
  goal_intensity: Profile['goal_intensity']
  activity_level: Profile['activity_level']
  water_goal_liters: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: QuizData) => Promise<void>
  initialData: QuizData
  preventClose?: boolean
}

const TOTAL_STEPS = 8

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcCalories(d: QuizData): number {
  const w = parseFloat(d.weight)
  const h = parseFloat(d.height)
  const a = parseInt(d.age)
  if (!w || !h || !a || !d.gender) return 2000

  let bmr = 10 * w + 6.25 * h - 5 * a
  if (d.gender === 'Masculino') bmr += 5
  else if (d.gender === 'Femenino') bmr -= 161
  else bmr -= 78

  const multipliers: Record<string, number> = {
    Sedentario: 1.2, Ligero: 1.375, Moderado: 1.55, 'Muy Activo': 1.725, Atleta: 1.9,
  }
  const tdee = bmr * (multipliers[d.activity_level ?? 'Moderado'] ?? 1.55)

  const offsets: Record<string, Record<string, number>> = {
    'Perder Grasa': { Estándar: -300, Moderado: -500, Agresivo: -750 },
    'Mantener Peso': { Estándar: 0, Moderado: 0, Agresivo: 0 },
    'Ganar Músculo': { Estándar: 200, Moderado: 400, Agresivo: 600 },
  }
  const result = Math.round(tdee + (offsets[d.goal_type ?? 'Mantener Peso']?.[d.goal_intensity ?? 'Moderado'] ?? 0))
  return Math.max(1200, result)
}

// ── Option Card ───────────────────────────────────────────────────────────────
function OptionCard({
  label, desc, icon, selected, onClick,
}: { label: string; desc?: string; icon: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
        selected
          ? 'border-[#7B61FF] bg-white shadow-[4px_4px_0px_0px_#7B61FF]'
          : 'border-black bg-white hover:bg-slate-50'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-all ${
          selected ? 'bg-[#7B61FF]/10' : 'bg-slate-50'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-black tracking-tight ${selected ? 'text-[#7B61FF]' : 'text-slate-800'}`}>
          {label}
        </p>
        {desc && <p className="text-[11px] font-medium text-slate-600 mt-0.5">{desc}</p>}
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full bg-[#7B61FF] flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}

// ── Number Input ──────────────────────────────────────────────────────────────
function BigNumberInput({
  value, onChange, unit, placeholder, min, max, step = '1',
}: {
  value: string; onChange: (v: string) => void; unit: string; placeholder: string; min?: string; max?: string; step?: string
}) {
  return (
    <div className="flex items-end justify-center gap-3 mt-2">
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-36 text-center text-5xl font-black text-slate-800 tracking-tighter bg-white border-2 border-black focus:border-[#7B61FF] rounded-3xl py-5 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      />
      <span className="text-lg font-black text-slate-900 pb-6">{unit}</span>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function PreferencesQuizModal({ isOpen, onClose, onSave, initialData, preventClose = false }: Props) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const [data, setData] = useState<QuizData>(initialData)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Re-sync state every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setData(initialData)
      setStep(0)
      setDir('forward')
      setAnimating(false)
      setSaveError(null)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const calculatedCalories = useMemo(() => calcCalories(data), [data])

  const set = <K extends keyof QuizData>(key: K, value: QuizData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }))

  const goTo = (next: number, direction: 'forward' | 'back') => {
    if (animating) return
    setAnimating(true)
    setDir(direction)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 260)
  }

  const next = () => step < TOTAL_STEPS - 1 && goTo(step + 1, 'forward')
  const back = () => step > 0 && goTo(step - 1, 'back')

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(data)
    } catch (err: any) {
      console.error('Error detail in modal:', err)
      setSaveError(err.message || 'Error al guardar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  // ── Steps content ─────────────────────────────────────────────────────────
  const steps: { title: string; subtitle: string; emoji: string; content: React.ReactNode }[] = [
    // Step 0: Gender
    {
      title: '¿Cómo te identificas?',
      subtitle: 'El sexo biológico influye directamente en tu metabolismo basal.',
      emoji: '👤',
      content: (
        <div className="space-y-3">
          {([
            { id: 'Masculino', label: 'Masculino', icon: '👨', desc: 'Metabolismo generalmente más alto' },
            { id: 'Femenino', label: 'Femenino', icon: '👩', desc: 'Metabolismo ajustado hormonalmente' },
            { id: 'Otro', label: 'Prefiero no decirlo', icon: '👤', desc: 'Usaremos una estimación media' },
          ] as const).map((g) => (
            <OptionCard key={g.id} {...g} selected={data.gender === g.id} onClick={() => set('gender', g.id)} />
          ))}
        </div>
      ),
    },
    // Step 1: Age
    {
      title: '¿Cuántos años tienes?',
      subtitle: 'El metabolismo basal disminuye aproximadamente un 2% por cada década.',
      emoji: '🎂',
      content: (
        <BigNumberInput
          value={data.age}
          onChange={(v) => set('age', v)}
          unit="años"
          placeholder="30"
          min="10"
          max="100"
        />
      ),
    },
    // Step 2: Height
    {
      title: '¿Cuánto mides?',
      subtitle: 'La altura es clave para calcular tu metabolismo basal con precisión.',
      emoji: '📏',
      content: (
        <BigNumberInput
          value={data.height}
          onChange={(v) => set('height', v)}
          unit="cm"
          placeholder="170"
          min="100"
          max="250"
        />
      ),
    },
    // Step 3: Weight
    {
      title: '¿Cuánto pesas ahora?',
      subtitle: 'Tu peso actual es el factor principal en el cálculo de tu gasto energético.',
      emoji: '⚖️',
      content: (
        <BigNumberInput
          value={data.weight}
          onChange={(v) => set('weight', v)}
          unit="kg"
          placeholder="70"
          min="20"
          max="300"
          step="0.1"
        />
      ),
    },
    // Step 4: Goal Type
    {
      title: '¿Cuál es tu objetivo?',
      subtitle: 'Ajustaremos tu ingesta calórica según lo que quieres conseguir.',
      emoji: '🎯',
      content: (
        <div className="space-y-3">
          {([
            { id: 'Perder Grasa', label: 'Perder grasa', icon: '🔥', desc: 'Déficit calórico controlado para quemar grasa preservando músculo' },
            { id: 'Mantener Peso', label: 'Mantener peso', icon: '⚖️', desc: 'Equilibrio calórico para mantener tu composición corporal actual' },
            { id: 'Ganar Músculo', label: 'Ganar músculo', icon: '💪', desc: 'Superávit calórico para favorecer la síntesis proteica y el crecimiento' },
          ] as const).map((g) => (
            <OptionCard key={g.id} {...g} selected={data.goal_type === g.id} onClick={() => set('goal_type', g.id)} />
          ))}
        </div>
      ),
    },
    // Step 5: Goal Intensity
    {
      title: '¿Con qué intensidad?',
      subtitle: 'Define qué tan rápido quieres alcanzar tu objetivo. Más agresivo implica más sacrificio.',
      emoji: '⚡',
      content: (
        <div className="space-y-3">
          {([
            {
              id: 'Estándar', label: 'Suave', icon: '🐢',
              desc: data.goal_type === 'Perder Grasa' ? '-300 kcal/día · ~0.3 kg/semana' : data.goal_type === 'Ganar Músculo' ? '+200 kcal/día · Mínimo riesgo de grasa' : 'Balance calórico exacto',
            },
            {
              id: 'Moderado', label: 'Moderado', icon: '🚶',
              desc: data.goal_type === 'Perder Grasa' ? '-500 kcal/día · ~0.5 kg/semana' : data.goal_type === 'Ganar Músculo' ? '+400 kcal/día · Balance óptimo' : 'Balance calórico exacto',
            },
            {
              id: 'Agresivo', label: 'Agresivo', icon: '🏃',
              desc: data.goal_type === 'Perder Grasa' ? '-750 kcal/día · ~0.75 kg/semana' : data.goal_type === 'Ganar Músculo' ? '+600 kcal/día · Máximo superávit' : 'Balance calórico exacto',
            },
          ] as const).map((g) => (
            <OptionCard key={g.id} {...g} selected={data.goal_intensity === g.id} onClick={() => set('goal_intensity', g.id)} />
          ))}
        </div>
      ),
    },
    // Step 6: Activity Level
    {
      title: '¿Cómo es tu actividad física?',
      subtitle: 'El nivel de actividad multiplica tu metabolismo basal para obtener tu gasto real.',
      emoji: '🏃',
      content: (
        <div className="space-y-3">
          {([
            { id: 'Sedentario', label: 'Sedentario', icon: '🪑', desc: 'Trabajo de escritorio, sin ejercicio regular · ×1.2' },
            { id: 'Ligero', label: 'Ligeramente activo', icon: '🚶', desc: 'Ejercicio ligero 1-3 días a la semana · ×1.375' },
            { id: 'Moderado', label: 'Moderadamente activo', icon: '🏃', desc: 'Ejercicio moderado 3-5 días a la semana · ×1.55' },
            { id: 'Muy Activo', label: 'Muy activo', icon: '🏋️', desc: 'Ejercicio intenso 6-7 días a la semana · ×1.725' },
            { id: 'Atleta', label: 'Atleta', icon: '🔥', desc: 'Entrenamiento profesional o trabajo físico muy duro · ×1.9' },
          ] as const).map((g) => (
            <OptionCard key={g.id} {...g} selected={data.activity_level === g.id} onClick={() => set('activity_level', g.id)} />
          ))}
        </div>
      ),
    },
    // Step 7: Water + Summary
    {
      title: 'Meta de hidratación',
      subtitle: 'El agua óptima es 35 ml/kg de peso corporal. Selecciona tu meta diaria.',
      emoji: '💧',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-2">
            {[1.5, 2.0, 2.5, 3.0].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set('water_goal_liters', l)}
                className={`py-4 rounded-2xl text-sm font-black border-2 border-black transition-all ${
                  data.water_goal_liters === l
                    ? 'bg-sky-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l.toFixed(1)}L
              </button>
            ))}
          </div>

          {/* Summary Card */}
          <div className="bg-white border-2 border-black rounded-3xl p-6 text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4">Tu estimación personalizada</p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-black tracking-tighter text-[#7B61FF]">{calculatedCalories}</span>
              <span className="text-sm font-bold text-slate-600">kcal/día</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 font-medium">
              Calculado con la fórmula Mifflin-St Jeor · TDEE personalizado
            </p>
            <div className="mt-4 pt-4 border-t-2 border-slate-50 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Objetivo', value: data.goal_type?.replace(' ', '\n') ?? '—' },
                { label: 'Actividad', value: data.activity_level ?? '—' },
                { label: 'Intensidad', value: data.goal_intensity ?? '—' },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <p className="text-[9px] uppercase tracking-widest text-slate-600 font-black">{kpi.label}</p>
                  <p className="text-[11px] font-black mt-0.5 text-slate-800">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ]

  const current = steps[step]
  const progress = ((step + 1) / TOTAL_STEPS) * 100
  const isLast = step === TOTAL_STEPS - 1

  const slideOut = dir === 'forward' ? '-translate-x-8 opacity-0' : 'translate-x-8 opacity-0'
  const slideIn = dir === 'forward' ? 'translate-x-8 opacity-0' : '-translate-x-8 opacity-0'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pb-12 sm:pb-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !preventClose && onClose()}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-[#FFF156] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] border-2 border-black">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          {/* Mobile handle */}
          <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mb-5 sm:hidden" />

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-2 bg-[#7B61FF]/10 rounded-full overflow-hidden border border-[#7B61FF]/20">
              <div
                className="h-full bg-[#7B61FF] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-black text-black/40 tabular-nums shrink-0">
              {step + 1}/{TOTAL_STEPS}
            </span>
          </div>

          {/* Question header */}
          <div
            className={`transition-[transform,opacity] duration-[260ms] ${animating ? slideOut : 'translate-x-0 opacity-100'}`}
          >

            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight mb-1">
              {current.title}
            </h2>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              {current.subtitle}
            </p>
          </div>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div
            className={`transition-[transform,opacity] duration-[260ms] ${animating ? (dir === 'forward' ? slideIn : slideOut.replace('-', '')) : 'translate-x-0 opacity-100'}`}
          >
            {current.content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex items-center gap-3 shrink-0 bg-[#FFF156]">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="w-12 h-12 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-black hover:bg-slate-50 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : !preventClose ? (
            <button
              type="button"
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-black hover:bg-slate-50 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}

          <button
            type="button"
            onClick={isLast ? handleSave : next}
            disabled={saving}
            className={`flex-1 py-4 rounded-2xl font-black text-sm border-2 border-black transition-all active:scale-[0.98] disabled:opacity-60 bg-[#7B61FF] text-white`}
          >
            {saving
              ? 'Guardando...'
              : isLast
              ? 'Guardar mis preferencias'
              : 'Siguiente →'}
          </button>
        </div>

        {saveError && (
          <div className="px-6 pb-4 text-center text-xs font-bold text-red-500">
            ⚠️ {saveError}
          </div>
        )}
      </div>
    </div>
  )
}
