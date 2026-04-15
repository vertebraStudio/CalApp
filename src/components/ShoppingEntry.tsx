import React, { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Types mirror the FridgeItem structure expected by addItem
export interface ParsedShoppingItem {
  name: string
  category: string
  stock_amount: number
  stock_unit: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fats_per_100g: number
  low_stock_threshold: number
  selected: boolean
}

const CATEGORY_ICONS: Record<string, string> = {
  'Proteínas': '🥩', 'Lácteos': '🥛', 'Vegetales': '🥦',
  'Frutas': '🍎', 'Cereales': '🌾', 'Despensa': '🫙',
  'Bebidas': '🧃', 'Otros': '📦',
}

interface ShoppingEntryProps {
  onClose: () => void
  onAddItems: (items: Omit<ParsedShoppingItem, 'selected'>[]) => void
}

type Step = 'input' | 'parsing' | 'review'

export default function ShoppingEntry({ onClose, onAddItems }: ShoppingEntryProps) {
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [items, setItems] = useState<ParsedShoppingItem[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [ticketFile, setTicketFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleParse = async () => {
    if (!text.trim() && !ticketFile) return
    setStep('parsing')
    setErrorMsg('')

    try {
      let image_url: string | null = null

      // Upload ticket image if provided
      if (ticketFile) {
        const ext = ticketFile.name.split('.').pop()
        const path = `tickets/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('meal-images')
          .upload(path, ticketFile, { contentType: ticketFile.type })
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('meal-images').getPublicUrl(path)
        image_url = urlData.publicUrl
      }

      const body: Record<string, string> = {}
      if (text.trim()) body.text_description = text.trim()
      if (image_url) body.image_url = image_url

      const { data, error } = await supabase.functions.invoke('parse-shopping', { body })

      if (error) throw error
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No se pudieron identificar productos en la descripción.')
      }

      setItems(data.map((item: any) => ({ ...item, selected: true })))
      setStep('review')
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar la compra.')
      setStep('input')
    }
  }

  const handleToggle = (idx: number) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item))

  const handleChangeAmount = (idx: number, val: string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, stock_amount: parseFloat(val) || 0 } : item))

  const handleConfirm = () => {
    const selected = items.filter(i => i.selected).map(({ selected, ...rest }) => rest)
    if (selected.length > 0) onAddItems(selected)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-24 sm:pb-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              {step === 'review' ? '🛒 Confirmar Compra' : '🛒 Cargar Inventario'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {step === 'review'
                ? `${items.filter(i => i.selected).length} de ${items.length} productos seleccionados`
                : 'Describe lo que has comprado'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step: input */}
          {step === 'input' && (
            <div className="space-y-4">
              {/* Text / Voice */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Describe tu compra ✨ IA
                </label>
                <textarea
                  autoFocus
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Ej: He comprado 1 kilo de pechuga de pollo, un pack de 6 yogures griegos y 500g de espinacas..."
                  rows={4}
                  className="w-full bg-slate-50 text-slate-800 px-4 py-3 rounded-2xl font-medium text-sm border-2 border-transparent focus:border-[#7B61FF]/30 focus:bg-white resize-none transition-all outline-none placeholder:text-slate-300"
                />
                <p className="text-[10px] text-slate-400 mt-1 px-1">
                  La IA detectará automáticamente cada producto, su cantidad y sus macros
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-300 font-bold">O</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Ticket Scanner (placeholder for future) */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Escanear Ticket de Compra 📸
                </label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-2xl py-6 flex flex-col items-center gap-2 transition-all ${
                    ticketFile
                      ? 'border-[#7B61FF]/40 bg-[#7B61FF]/5'
                      : 'border-slate-200 hover:border-[#7B61FF]/30 hover:bg-slate-50'
                  }`}
                >
                  {ticketFile ? (
                    <>
                      <span className="text-2xl">🧾</span>
                      <p className="text-xs font-bold text-[#7B61FF] truncate max-w-[250px]">{ticketFile.name}</p>
                      <p className="text-[10px] text-slate-400">Toca para cambiar</p>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🧾</span>
                      <p className="text-sm font-bold text-slate-500">Subir foto del ticket</p>
                      <p className="text-[10px] text-slate-400">La IA identificará los productos y cantidades</p>
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => setTicketFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-xl">
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Step: parsing */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center py-16 gap-5">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[#7B61FF]/20 rounded-full" />
                <div className="w-16 h-16 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin absolute inset-0" />
                <span className="absolute inset-0 flex items-center justify-center text-xl">🛒</span>
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-800 text-lg">Analizando tu compra...</h3>
                <p className="text-slate-500 text-sm mt-1">La IA está identificando los productos</p>
              </div>
            </div>
          )}

          {/* Step: review */}
          {step === 'review' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-medium pb-1">
                Revisa y ajusta los productos detectados. Desmarca los que no quieras añadir.
              </p>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleToggle(idx)}
                  className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                    item.selected
                      ? 'border-[#7B61FF]/30 bg-[#7B61FF]/5'
                      : 'border-slate-100 bg-slate-50 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      item.selected ? 'border-[#7B61FF] bg-[#7B61FF]' : 'border-slate-300'
                    }`}>
                      {item.selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{CATEGORY_ICONS[item.category] ?? '🍽️'}</span>
                        <h4 className="font-bold text-slate-800 text-sm capitalize flex-1 truncate">{item.name}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">{item.category}</span>
                      </div>

                      {/* Stock editable */}
                      <div className="flex items-center gap-2 mb-2" onClick={e => e.stopPropagation()}>
                        <span className="text-xs text-slate-500 font-semibold">Stock:</span>
                        <input
                          type="number"
                          value={item.stock_amount}
                          onChange={e => handleChangeAmount(idx, e.target.value)}
                          className="w-20 bg-white border border-slate-200 text-slate-800 px-2 py-1 rounded-lg text-xs font-bold outline-none focus:border-[#7B61FF]/40"
                        />
                        <span className="text-xs text-slate-400 font-semibold">{item.stock_unit}</span>
                      </div>

                      {/* Mini macros */}
                      <div className="flex gap-2">
                        {[
                          { label: 'kcal', value: Math.round(item.calories_per_100g), color: 'text-violet-500' },
                          { label: 'P', value: `${item.protein_per_100g}g`, color: 'text-blue-500' },
                          { label: 'C', value: `${item.carbs_per_100g}g`, color: 'text-green-500' },
                          { label: 'G', value: `${item.fats_per_100g}g`, color: 'text-orange-500' },
                        ].map(m => (
                          <div key={m.label} className="text-center bg-white/70 rounded-lg px-2 py-0.5">
                            <p className={`text-[10px] font-black ${m.color}`}>{m.value}</p>
                            <p className="text-[8px] text-slate-400 font-semibold">{m.label}/100g</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 shrink-0">
          {step === 'input' && (
            <button
              type="button"
              disabled={!text.trim() && !ticketFile}
              onClick={handleParse}
              className="w-full bg-[#7B61FF] hover:bg-[#684DEC] disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-purple-200 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Analizar con IA ✨
            </button>
          )}
          {step === 'review' && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl text-sm transition-all hover:bg-slate-200 active:scale-[0.98]"
              >
                ← Volver
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={items.filter(i => i.selected).length === 0}
                className="flex-[2] bg-[#7B61FF] hover:bg-[#684DEC] disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-3.5 rounded-2xl text-sm shadow-lg shadow-purple-200 disabled:shadow-none transition-all active:scale-[0.98]"
              >
                Añadir {items.filter(i => i.selected).length} producto{items.filter(i => i.selected).length !== 1 ? 's' : ''} 🧊
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
