import React, { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { MealEntryData } from '@/hooks/useSaveMealEntry'
import type { AIAnalysis, MealType } from '@/types'

function getDefaultMealType(): MealType {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 16) return 'lunch'
  if (hour >= 16 && hour < 20) return 'snack'
  return 'dinner'
}

interface ImageUploadProps {
  onClose: () => void
  onAnalysisComplete: (data: Partial<MealEntryData>) => void
}

type Step = 'pick' | 'analyzing' | 'error'

export default function ImageUpload({ onClose, onAnalysisComplete }: ImageUploadProps) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('pick')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleAnalyze = async () => {
    if (!file || !user) return
    setStep('analyzing')

    try {
      // 1. Subir a Storage
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('food-images').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('food-images').getPublicUrl(path)

      // 2. Llamar a la Edge Function
      const { data, error: fnErr } = await supabase.functions.invoke('analyze-food', {
        body: { image_url: publicUrl },
      })
      if (fnErr) throw fnErr

      const analysis = data as AIAnalysis

      // 3. Pasar resultados al formulario central
      onAnalysisComplete({
        food_name: analysis.food_name,
        calories: analysis.calories,
        macros: {
          p: analysis.macros.p,
          c: analysis.macros.c,
          f: analysis.macros.f
        },
        meal_type: getDefaultMealType(),
        image_url: publicUrl
      })
      onClose()

    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al analizar la imagen')
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 overflow-hidden shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-slate-800 text-xl">Analizar comida</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-slate-50 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {step === 'error' && (
          <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* Step: pick */}
        {(step === 'pick' || step === 'error') && (
          <div className="space-y-4 animate-fadeIn">
            <input ref={fileRef} id="food-image-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-56 object-cover rounded-2xl shadow-sm border border-slate-100" />
            ) : (
              <button
                id="pick-image-btn"
                onClick={() => fileRef.current?.click()}
                className="w-full h-56 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-[#7B61FF] hover:text-[#7B61FF] transition-all bg-slate-50/50"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm font-bold">Seleccionar fotografía</span>
              </button>
            )}
            {preview && (
              <button id="analyze-btn" onClick={handleAnalyze} className="w-full bg-[#7B61FF] text-white rounded-2xl py-4 text-lg font-black shadow-xl shadow-purple-100 transition-all active:scale-95">
                Analizar con IA ✨
              </button>
            )}
          </div>
        )}

        {/* Step: analyzing */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center py-12 gap-5 animate-pulse">
            <div className="w-16 h-16 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="font-bold text-slate-800 text-lg">Analizando comida...</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Calculando macros mágicamente</p>
            </div>
          </div>
        )}

        {/* Step: error */}
        {step === 'error' && (
          <div className="space-y-4 py-4">
            <div className="bg-red-50 text-red-500 text-sm font-bold px-4 py-4 rounded-2xl border border-red-100">
              {errorMsg}
            </div>
            <button onClick={() => setStep('pick')} className="w-full bg-slate-800 text-white rounded-2xl py-4 font-black">
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
