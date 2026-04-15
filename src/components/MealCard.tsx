import React from 'react'
import type { Meal } from '@/types'

interface MealCardProps {
  meal: Meal
  onDelete?: (id: string) => void
  onClick?: () => void
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-1 rounded-lg ${color} bg-opacity-10`}>
      <span className={`text-[10px] font-bold ${color.replace('bg-', 'text-')}`}>{value}g</span>
      <span className={`text-[8px] uppercase tracking-tighter opacity-70 ${color.replace('bg-', 'text-')}`}>{label}</span>
    </div>
  )
}

export default function MealCard({ meal, onDelete, onClick }: MealCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl p-3 flex gap-4 items-center group shadow-sm border border-slate-50 transition-all ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
      {/* Imagen */}
      {meal.image_url ? (
        <img
          src={meal.image_url}
          alt={meal.name}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 truncate text-sm capitalize">{meal.name}</h3>
            <p className="text-[#5BC897] font-extrabold text-[11px]">{meal.calories} kcal</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex gap-1.5">
                <MacroPill label="P" value={meal.protein} color="bg-orange-500" />
                <MacroPill label="C" value={meal.carbs} color="bg-amber-500" />
                <MacroPill label="F" value={meal.fats} color="bg-purple-500" />
             </div>
             
             {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(meal.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 p-1.5 hover:bg-red-50 rounded-lg"
                  aria-label="Eliminar comida"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}
