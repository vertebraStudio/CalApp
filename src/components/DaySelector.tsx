import { useMemo } from 'react'

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
        <h2 className="text-slate-800 font-black text-xl tracking-tight">
          {selectedDate === todayIso ? 'Hoy' : 'Registro'}, <span className="text-slate-400 font-bold">{displayDate}</span>
        </h2>
        <div className="p-2 text-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
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
                  ? 'bg-[#7B61FF] border-[#7B61FF] text-white shadow-lg shadow-purple-200 scale-105'
                  : isSelected
                    ? 'bg-white border-[#7B61FF] shadow-md shadow-purple-50 scale-105'
                    : 'bg-white border-transparent text-slate-400'
              }`}
            >
              <span className={`text-[9px] font-black tracking-widest ${isToday ? 'text-white/70' : isSelected ? 'text-[#7B61FF]' : 'text-slate-400'}`}>
                {day.dayName}
              </span>
              <span className={`text-lg font-black leading-none ${isToday ? 'text-white' : isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                {day.dayNum}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
