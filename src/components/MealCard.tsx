import { useState, useRef } from 'react'
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

const CATEGORIES = [
  { id: 'Verduras', icon: '🥦' },
  { id: 'Frutas', icon: '🍎' },
  { id: 'Snacks', icon: '🍕' },
  { id: 'Carne', icon: '🥩' },
  { id: 'Pescado', icon: '🐟' },
  { id: 'Cereales', icon: '🌾' },
  { id: 'Frutos Secos', icon: '🥜' },
  { id: 'Lácteos', icon: '🥛' },
  { id: 'Legumbres', icon: '🫘' },
  { id: 'Bebidas', icon: '🥤' },
  { id: 'Platos Preparados', icon: '🥘' },
  { id: 'Congelados', icon: '🧊' },
  { id: 'Panadería', icon: '🥖' },
]

export default function MealCard({ meal, onDelete, onClick }: MealCardProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const SWIPE_THRESHOLD = -80 // Distancia para mantener abierto el botón de borrar

  const categoryData = CATEGORIES.find(c => c.id === meal.categoria)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current
    
    // Si el movimiento es más vertical que horizontal, ignoramos el swipe
    if (Math.abs(deltaY) > Math.abs(deltaX)) return

    // Solo permitimos deslizar hacia la izquierda (deltaX < 0)
    if (deltaX < 0) {
      setOffsetX(Math.max(-100, deltaX))
    } else {
      setOffsetX(0)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (offsetX < SWIPE_THRESHOLD) {
      setOffsetX(-80) // Se queda abierto
    } else {
      setOffsetX(0) // Vuelve a su sitio
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div className="relative group overflow-hidden rounded-[1.5rem] mb-2 last:mb-0">
      {/* Botón de Borrar (Detrás) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete?.(meal.id)
        }}
        className="absolute inset-y-0 right-0 w-24 bg-[#7B61FF] flex flex-col items-center justify-center text-white transition-all duration-200 border-2 border-black rounded-r-[1.5rem] rounded-l-none"
        style={{ opacity: offsetX < -20 ? 1 : 0 }}
      >
        <div className="flex flex-col items-center justify-center">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      </button>

      {/* Tarjeta Principal */}
      <div 
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`bg-white rounded-[1.5rem] p-3.5 flex items-center gap-4 border-2 border-black relative z-10 transition-all ${onClick ? 'cursor-pointer active:translate-x-0.5 active:translate-y-0.5' : ''}`}
        style={{ 
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: offsetX < 0 ? 'none' : '2px 2px 0px 0px rgba(0,0,0,1)'
        }}
      >
        {/* Imagen */}
        {meal.image_url ? (
          <img
            src={meal.image_url}
            alt={meal.name}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 border-2 border-black border-dashed">
            <span className="text-xl">🍲</span>
          </div>
        )}

        {/* Info Izquierda */}
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-800 text-sm capitalize truncate leading-tight">
            {meal.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
             {meal.categoria ? (
               <span className="text-[10px] font-black text-[#7B61FF] uppercase tracking-widest flex items-center gap-1">
                 <span>{categoryData?.icon || '🛒'}</span>
                 <span>{meal.categoria}</span>
               </span>
             ) : (
               <span className="text-[10px] font-black uppercase tracking-widest">
                 {meal.meal_type === 'breakfast' && '🍳 Desayuno'}
                 {meal.meal_type === 'lunch' && '🥗 Comida'}
                 {meal.meal_type === 'snack' && '🍎 Snack'}
                 {meal.meal_type === 'dinner' && '🍲 Cena'}
               </span>
             )}
          </div>
        </div>

        {/* Calorías (Derecha) */}
        <div className="flex flex-col items-end pl-2">
          <span className="text-2xl font-black text-[#7B61FF] leading-none">
            {Math.round(meal.calories)}
          </span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
            kcal
          </span>
        </div>
      </div>
    </div>
  )
}
