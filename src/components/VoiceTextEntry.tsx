import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MealEntryData } from '@/hooks/useSaveMealEntry'

interface VoiceTextEntryProps {
  onClose: () => void
  onAnalysisComplete: (data: Partial<MealEntryData>) => void
}

type Step = 'input' | 'analyzing'
type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export default function VoiceTextEntry({ onClose, onAnalysisComplete }: VoiceTextEntryProps) {
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!text.trim()) return
    
    setStep('analyzing')
    setError(null)

    try {
      const { data, error: funcError } = await supabase.functions.invoke('analyze-food', {
        body: { text_description: text }
      })

      if (funcError) throw funcError
      
      // Calculate Default Meal Type based on time
      const hour = new Date().getHours()
      let defaultType: MealType = 'lunch'
      if (hour >= 6 && hour < 11) defaultType = 'breakfast'
      else if (hour >= 11 && hour < 16) defaultType = 'lunch'
      else if (hour >= 16 && hour < 20) defaultType = 'snack'
      else defaultType = 'dinner'

      onAnalysisComplete({
        ...data,
        meal_type: defaultType
      })
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message || 'Error al analizar el texto con IA')
      setStep('input')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn pb-24 sm:pb-6">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 overflow-hidden shadow-2xl border border-slate-100 animate-slideUp">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-slate-800 text-xl">Registro Libre</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-slate-50 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="relative">
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ej: Me he comido un bocadillo de tortilla francesa y un café con leche..."
                className="w-full bg-slate-50 text-slate-800 px-5 py-4 rounded-2xl text-base placeholder:text-slate-400 border-2 border-transparent focus:border-[#7B61FF]/30 focus:bg-white transition-all outline-none resize-none h-36"
              />
              <div className="absolute right-3 bottom-3 text-slate-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            
            <button 
              onClick={handleAnalyze} 
              disabled={!text.trim()}
              className="w-full bg-[#7B61FF] text-white rounded-2xl py-4 text-lg font-black shadow-lg shadow-purple-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              Analizar con IA ✨
            </button>
            <p className="text-xs text-center font-semibold text-slate-400 mt-2">
              Usa el dictado de tu teclado para ir más rápido
            </p>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center py-12 gap-5 animate-pulse">
            <div className="w-16 h-16 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="font-bold text-slate-800 text-lg">Analizando comida...</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Calculando macros e ingredientes mágicamente</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
