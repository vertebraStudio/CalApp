import { useState } from 'react'
import { usePlanner, useRemoveFromPlanner } from '@/hooks/usePlanner'
import type { MealType } from '@/types'

const TODAY = new Date().toISOString().slice(0, 10)

const MEAL_TYPE_LABELS: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: 'Desayuno', emoji: '🌅' },
  lunch:     { label: 'Almuerzo', emoji: '☀️' },
  snack:     { label: 'Snacks', emoji: '🍎' },
  dinner:    { label: 'Cena',     emoji: '🌙' },
}

export default function PlannerPage() {
  const [date, setDate] = useState(TODAY)
  const { data: entries = [], isLoading } = usePlanner(date)
  const remove = useRemoveFromPlanner()

  const grouped = (Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(type => ({
    type,
    ...MEAL_TYPE_LABELS[type],
    items: entries.filter(e => e.meal_type === type),
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Planificador</h1>
        <p className="text-slate-400 text-sm mt-0.5">Organiza tus comidas por día</p>
      </div>

      {/* Date picker */}
      <div className="card">
        <label htmlFor="planner-date" className="label">Fecha</label>
        <input
          id="planner-date"
          type="date"
          className="input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ type, label, emoji, items }) => (
            <div key={type} className="card space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <h2 className="font-semibold text-white">{label}</h2>
                <span className="badge bg-slate-800 text-slate-400 ml-auto">{items.length}</span>
              </div>

              {items.length === 0 ? (
                <p className="text-slate-500 text-sm">Sin comidas planificadas</p>
              ) : (
                <div className="space-y-2">
                  {items.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800 last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{entry.meal?.name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{entry.meal?.calories ?? 0} kcal</p>
                      </div>
                      <button
                        onClick={() => remove.mutate(entry.id)}
                        className="text-slate-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-950/40 transition-colors flex-shrink-0"
                        aria-label="Eliminar del planner"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
