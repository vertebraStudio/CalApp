import React, { useMemo } from 'react'

interface DaySelectorProps {
  selectedDate: string // YYYY-MM-DD
  onDateChange: (date: string) => void
}

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

export default function DaySelector({ selectedDate, onDateChange }: DaySelectorProps) {
  const todayIso = useMemo(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Generar los 7 días de la semana actual (Lunes a Domingo)
  const days = useMemo(() => {
    const list = []
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    // día de la semana (0=Dom, 1=Lun...)
    const currentDay = now.getDay()
    // Diferencia para llegar al lunes de la semana actual
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay
    
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    
    for (let i = 0; i < 7; i++) {
       const d = new Date(monday)
       d.setDate(monday.getDate() + i)
       
       const y = d.getFullYear()
       const m = String(d.getMonth() + 1).padStart(2, '0')
       const dayNum = d.getDate()
       const dd = String(dayNum).padStart(2, '0')
       
       list.push({ 
         iso: `${y}-${m}-${dd}`, 
         dayName: WEEKDAYS[i], 
         dayNum 
       })
    }
    return list
  }, [])

  const displayDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }, [selectedDate])

  return (
    <div className="space-y-4 pt-2">
      {/* Date Title */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-white font-black text-xl tracking-tight">
          <span className="text-[#FFF156]">{selectedDate === todayIso ? 'Hoy' : 'Registro'},</span> <span className="text-white/60 font-bold">{displayDate}</span>
        </h2>
        <div />
      </div>

      {/* Horizontal Days List */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-4 -my-4">
        {days.map((day) => {
          const isSelected = day.iso === selectedDate
          const isToday = day.iso === todayIso
          
          return (
            <button
              key={day.iso}
              onClick={() => onDateChange(day.iso)}
              className={`flex-shrink-0 w-[50px] h-[70px] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 border-2 ${
                isToday
                  ? 'bg-[#FFF156] border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-105'
                  : isSelected
                    ? 'bg-white border-white shadow-md scale-105'
                    : 'bg-white/10 border-transparent text-white'
              }`}
            >
              <span className={`text-[9px] font-black tracking-widest ${isToday ? 'text-black/50' : isSelected ? 'text-[#7B61FF]' : 'text-white/50'}`}>
                {day.dayName}
              </span>
              <span className={`text-lg font-black leading-none ${isToday ? 'text-black' : isSelected ? 'text-slate-800' : 'text-white/80'}`}>
                {day.dayNum}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
