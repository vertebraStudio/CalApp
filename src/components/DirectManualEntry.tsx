import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface DirectManualEntryProps {
  onClose: () => void
  onSuccess?: (foodId: string, foodData: any) => void
  initialData?: {
    id?: string | number
    food_name: string
    brand_name?: string
    calories: number
    macros: { 
      p: number; 
      c: number; 
      f: number;
      sugar?: number;
      salt?: number;
    }
    meal_type?: 'breakfast' | 'lunch' | 'snack' | 'dinner'
    image_url?: string | null
    serving_size_g?: number
    serving_unit?: string
    base_unit?: string
  } | null
}


export default function DirectManualEntry({ onClose, onSuccess, initialData }: DirectManualEntryProps) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [categoria, setCategoria] = useState<string>('Verduras')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [sugar, setSugar] = useState('')
  const [salt, setSalt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const CATEGORIES = [
    'Verduras', 'Frutas', 'Snacks', 'Carne', 'Pescado', 'Cereales', 
    'Frutos Secos', 'Lácteos', 'Legumbres', 'Bebidas', 'Platos Preparados', 
    'Congelados', 'Panadería'
  ]

  // Scanning states
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle')
  const [scanError, setScanError] = useState<string | null>(null)
  const [amount, setAmount] = useState('100')
  const [unit, setUnit] = useState('g')
  const [servingWeight, setServingWeight] = useState('')
  const [baseValues, setBaseValues] = useState<{
    calories: number
    p: number
    c: number
    f: number
    sugar: number
    salt: number
    unitType: 'g' | 'unit'
  } | null>(null)

  // Initialization
  useEffect(() => {
    if (initialData) {
      setName(initialData.food_name || '')
      setBrand(initialData.brand_name || '')
      if ((initialData as any).categoria) {
        setCategoria((initialData as any).categoria)
      }
      setCalories(initialData.calories?.toString() || '')
      setProtein(initialData.macros?.p?.toString() || '')
      setCarbs(initialData.macros?.c?.toString() || '')
      setFats(initialData.macros?.f?.toString() || '')
      setSugar(initialData.macros?.sugar?.toString() || '')
      setSalt(initialData.macros?.salt?.toString() || '')
      setImageUrl(initialData.image_url || null)
      
      if (initialData.serving_size_g) {
        setAmount('1')
        setUnit(initialData.serving_unit || 'ración')
        setServingWeight(initialData.serving_size_g.toString())
      } else {
        setAmount('100')
        setUnit(initialData.base_unit || 'g')
      }

      // If editing existing, set base values for auto-recalc
      if (initialData.id) {
        setBaseValues({
          calories: initialData.calories,
          p: initialData.macros.p,
          c: initialData.macros.c,
          f: initialData.macros.f,
          sugar: initialData.macros.sugar || 0,
          salt: initialData.macros.salt || 0,
          unitType: initialData.base_unit === 'ml' ? 'g' : 'g' // unitType is only g or unit in this component
        })
      }
    }
  }, [initialData])

  // AI Label Scan Handler
  const handleLabelScan = async (file: File) => {
    if (!user) return
    setScanState('uploading')
    setScanError(null)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${ext}`
      const path = `${user.id}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('food-images')
        .upload(path, file, { cacheControl: '3600', upsert: true })

      if (uploadErr) throw new Error(`Error al subir imagen: ${uploadErr.message}`)

      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(path)

      setScanState('analyzing')

      const { data, error: fnErr } = await supabase.functions.invoke('analyze-food', {
        body: { image_url: publicUrl, mode: 'label' },
      })

      if (fnErr) {
        console.error('Full Edge Function Error:', fnErr)
        let msg = fnErr.message
        try {
          // FunctionsHttpError contains the response body
          const body = await fnErr.context.json()
          if (body?.error) msg = body.error
        } catch (e) {
          console.error('Failed to parse error body:', e)
        }
        throw new Error(`Análisis fallido: ${msg}`)
      }

      if (!data) throw new Error('No se recibió respuesta del servidor de análisis.')
      
      const result = data as {
        food_name: string
        brand: string
        calories_per_100g: number
        protein_per_100g: number
        carbs_per_100g: number
        fats_per_100g: number
        sugar_per_100g: number
        salt_per_100g: number
        serving_size_g: number | null
        serving_unit: string
        confidence: number
      }

      // Only throw if absolutely nothing was found or returned
      if (!result.food_name && !result.calories_per_100g) {
        throw new Error('No se pudo extraer información legible. Intenta con una foto más clara.')
      }

      // Do NOT overwrite name or brand from the label scan
      // if (result.food_name) setName(result.food_name)
      // if (result.brand) setBrand(result.brand)

      if (result.serving_size_g && result.serving_unit) {
        // Has serving info: show per-serving values
        const ratio = result.serving_size_g / 100
        setAmount('1')
        setUnit(result.serving_unit)
        setServingWeight(result.serving_size_g.toString())
        setCalories(Math.round(result.calories_per_100g * ratio).toString())
        setProtein(Number((result.protein_per_100g * ratio).toFixed(1)).toString())
        setCarbs(Number((result.carbs_per_100g * ratio).toFixed(1)).toString())
        setFats(Number((result.fats_per_100g * ratio).toFixed(1)).toString())
        setSugar(Number((result.sugar_per_100g * ratio).toFixed(1)).toString())
        setSalt(Number((result.salt_per_100g * ratio).toFixed(2)).toString())
        // Enable auto-recalc from serving base
        setBaseValues({
          calories: result.calories_per_100g * ratio,
          p: result.protein_per_100g * ratio,
          c: result.carbs_per_100g * ratio,
          f: result.fats_per_100g * ratio,
          sugar: result.sugar_per_100g * ratio,
          salt: result.salt_per_100g * ratio,
          unitType: 'g'
        })
      } else {
        // No serving: show per-100g values directly
        setAmount('100')
        setUnit('g')
        setServingWeight('')
        setCalories(Math.round(result.calories_per_100g).toString())
        setProtein(result.protein_per_100g.toString())
        setCarbs(result.carbs_per_100g.toString())
        setFats(result.fats_per_100g.toString())
        setSugar(result.sugar_per_100g.toString())
        setSalt(result.salt_per_100g.toString())
        setBaseValues(null)
      }

      // Do NOT set image URL for label scans
      // setImageUrl(publicUrl) 
      setScanState('done')
    } catch (err) {
      console.error('Error en escaneo IA:', err)
      setScanError(err instanceof Error ? err.message : 'Error desconocido')
      setScanState('error')
    }
  }

  // Cover photo upload (separate from AI scan)
  const uploadCoverImage = async (file: File) => {
    if (!user) return null;
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const path = `${user.id}/${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from('food-images')
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadErr) { console.error('Error subiendo portada:', uploadErr); return null; }
      const { data: { publicUrl } } = supabase.storage.from('food-images').getPublicUrl(path);
      setImageUrl(publicUrl);
      return publicUrl;
    } catch (err) {
      console.error('Error inesperado:', err);
      return null;
    }
  };


  // Auto-recalculate when amount or baseValues change
  useEffect(() => {
    if (!baseValues) return
    const numAmount = parseFloat(amount) || 0

    setCalories(Math.round(baseValues.calories * numAmount).toString())
    setProtein(Number((baseValues.p * numAmount).toFixed(1)).toString())
    setCarbs(Number((baseValues.c * numAmount).toFixed(1)).toString())
    setFats(Number((baseValues.f * numAmount).toFixed(1)).toString())
    setSugar(Number((baseValues.sugar * numAmount).toFixed(1)).toString())
    setSalt(Number((baseValues.salt * numAmount).toFixed(2)).toString())
  }, [amount, baseValues])

  // Handle manual edits (override and disconnect auto-recalc)
  const handleManualCal = (v: string) => { setBaseValues(null); setCalories(v); }
  const handleManualP = (v: string) => { setBaseValues(null); setProtein(v); }
  const handleManualC = (v: string) => { setBaseValues(null); setCarbs(v); }
  const handleManualF = (v: string) => { setBaseValues(null); setFats(v); }
  const handleManualSugar = (v: string) => { setBaseValues(null); setSugar(v); }
  const handleManualSalt = (v: string) => { setBaseValues(null); setSalt(v); }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !calories) return

    if (calories && name.length > 2) {
      if (initialData?.id && !showConfirmModal) {
        setShowConfirmModal(true)
        return
      }
      setIsSaving(true)
      // Calculate values per 100g based on the reference portion
      const numAmount = parseFloat(amount) || 100
      const isServingUnit = ['ración', 'unidad', 'vaso', 'lata'].includes(unit)
      const sWeight = isServingUnit ? parseFloat(servingWeight) || 0 : 0
      
      const totalWeightGrams = isServingUnit ? (numAmount * sWeight) : numAmount
      const factor = totalWeightGrams > 0 ? (100 / totalWeightGrams) : 1

      try {
        console.log('Intentando registro en Base de Datos Global:', {
          name: name.trim(),
          brand: brand.trim(),
          created_by: user?.id
        })

        const foodData: any = {
          name: name.trim(),
          brand: brand.trim(),
          categoria: categoria,
          normalized_name: name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          calories_per_100g: Number((parseFloat(calories) * factor).toFixed(0)),
          protein_per_100g: Number((parseFloat(protein) * factor).toFixed(1)),
          carbs_per_100g: Number((parseFloat(carbs) * factor).toFixed(1)),
          fats_per_100g: Number((parseFloat(fats) * factor).toFixed(1)),
          sugar_per_100g: Number((parseFloat(sugar) * factor).toFixed(1)),
          salt_per_100g: Number((parseFloat(salt) * factor).toFixed(2)),
          verified_by_community: true,
          created_by: user?.id,
          image_url: imageUrl,
          serving_size_g: isServingUnit ? (sWeight || null) : null,
          serving_unit: isServingUnit ? unit : null,
          base_unit: (unit === 'ml' || unit === 'vaso') ? 'ml' : 'g'
        }

        if (initialData?.id) {
          foodData.id = initialData.id
        }

        const { data: globalData, error: globalErr } = await supabase
          .from('global_foods')
          .upsert([foodData])
          .select()

        if (globalErr) {
          console.error('Error al guardar en comunidad:', globalErr)
          alert(`Error al guardar: ${globalErr.message}`)
        } else {
          if (onSuccess && globalData?.[0]) {
            // Prepare a comprehensive object for the diary entry
            const diaryEntry = {
              food_id: globalData[0].id,
              food_name: name.trim() + (brand ? ` (${brand.trim()})` : ''),
              calories: Math.round(parseFloat(calories)),
              macros: {
                p: parseFloat(protein) || 0,
                c: parseFloat(carbs) || 0,
                f: parseFloat(fats) || 0,
                sugar: parseFloat(sugar) || 0,
                salt: parseFloat(salt) || 0
              },
              categoria: categoria,
              image_url: imageUrl,
              base_values: {
                calories: globalData[0].calories_per_100g,
                p: globalData[0].protein_per_100g,
                c: globalData[0].carbs_per_100g,
                f: globalData[0].fats_per_100g,
                sugar: globalData[0].sugar_per_100g,
                salt: globalData[0].salt_per_100g,
                serving_size_g: globalData[0].serving_size_g,
                serving_unit: globalData[0].serving_unit,
                base_unit: globalData[0].base_unit,
                is_liquid: globalData[0].base_unit === 'ml'
              }
            }
            onSuccess(globalData[0].id, diaryEntry)
          }
          onClose()
        }
      } catch (err) {
        console.error('Error inesperado:', err)
      } finally {
        setIsSaving(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn pb-20 sm:pb-6">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[82vh] overflow-hidden animate-slideUp">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              {initialData?.id ? 'Modificar Alimento' : 'Registro Directo'}
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {initialData?.id ? 'Actualizando datos de la comunidad' : 'Nuevo alimento para la comunidad'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
          <form id="manual-entry-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Cover Photo Selection */}
            {!imageUrl ? (
              <div
                className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4 group transition-all hover:bg-slate-100/50 active:scale-[0.98] cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadCoverImage(file);
                }} />
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">📸</div>
                <div className="text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Foto de Portada</p>
                  <p className="text-[10px] text-slate-300 font-bold mt-1">Añade una carátula para la comunidad</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-[2.5rem] overflow-hidden h-48 group shadow-2xl border-4 border-white">
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-6">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/20 backdrop-blur-md px-5 py-2 rounded-full border border-white/30">Carátula de la comunidad</span>
                </div>
                <button type="button" onClick={() => setImageUrl(null)} className="absolute top-4 right-4 w-10 h-10 bg-white shadow-xl rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 active:scale-90">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            {/* General Info */}
            <div className="space-y-4 relative z-20">
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del alimento..."
                  className="w-full bg-slate-50 text-slate-800 p-4 rounded-2xl font-black text-base text-center border-2 border-transparent focus:border-[#7B61FF]/10 focus:bg-white transition-all outline-none"
                />
              </div>

              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Marca (Ej: Hacendado, Danone...)"
                className="w-full bg-slate-50 text-slate-800 p-4 rounded-2xl font-black text-base text-center border-2 border-transparent focus:border-slate-100 focus:bg-white transition-all outline-none"
              />

              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-slate-100 focus-within:bg-white transition-all">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría del Alimento</span>
                  <span className="text-[8px] font-black text-[#7B61FF] bg-[#7B61FF]/10 px-2 py-0.5 rounded-full">OBLIGATORIO</span>
                </div>
                <select 
                  required
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-transparent text-slate-800 font-black text-base outline-none cursor-pointer appearance-none capitalize pl-1"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* AI Label Scan Button */}
              {/* Hidden input specifically for AI scan */}
              <input
                id="ai-scan-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLabelScan(file);
                  // Reset value so same file can be picked again
                  e.target.value = '';
                }}
              />

              {/* Scan State Overlay */}
              {(scanState === 'uploading' || scanState === 'analyzing') && (
                <div className="bg-[#7B61FF]/5 border-2 border-[#7B61FF]/20 rounded-3xl p-5 flex flex-col items-center gap-3 animate-fadeIn">
                  <div className="w-10 h-10 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-black text-[#7B61FF] uppercase tracking-widest">
                      {scanState === 'uploading' ? 'Subiendo imagen...' : 'Analizando etiqueta con IA ✨'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">
                      {scanState === 'analyzing' && 'Extrayendo valores nutricionales por 100g...'}
                    </p>
                  </div>
                </div>
              )}

              {scanState === 'done' && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl px-5 py-3 flex items-center gap-3 animate-fadeIn">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">¡Etiqueta leída!</p>
                    <p className="text-[9px] text-emerald-500 font-bold mt-0.5">Campos rellenados automáticamente. Comprueba y ajusta si es necesario.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScanState('idle')}
                    className="ml-auto p-1.5 text-emerald-400 hover:text-emerald-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              {scanState === 'error' && (
                <div className="bg-red-50 border-2 border-red-100 rounded-3xl px-5 py-3 flex items-start gap-3 animate-fadeIn">
                  <span className="text-xl mt-0.5">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-red-600 uppercase tracking-widest">Error al analizar</p>
                    <p className="text-[9px] text-red-400 font-bold mt-0.5 leading-relaxed">{scanError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setScanState('idle'); document.getElementById('ai-scan-input')?.click() }}
                    className="shrink-0 text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-100 px-3 py-1.5 rounded-xl hover:bg-red-200 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={scanState === 'uploading' || scanState === 'analyzing'}
                onClick={() => document.getElementById('ai-scan-input')?.click()}
                className="w-full bg-gradient-to-r from-[#7B61FF] to-[#A78BFA] hover:from-[#684DEC] hover:to-[#9061F9] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl flex items-center justify-center gap-2.5 group transition-all active:scale-[0.98] shadow-lg shadow-purple-200"
              >
                <span className="text-lg">✨</span>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black uppercase tracking-widest leading-tight">Escanear etiqueta nutricional</span>
                  <span className="text-[8px] font-bold text-white/70 leading-tight">Autocompletar con IA</span>
                </div>
                <svg className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>

              {/* Porción de Referencia */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#7B61FF] uppercase tracking-widest">Porción de Referencia</span>
                  <div className="px-2 py-0.5 bg-[#7B61FF]/10 text-[#7B61FF] text-[8px] font-bold rounded-full">OBLIGATORIO</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-400 mb-2">Cantidad</span>
                    <div className="flex items-center justify-between gap-1">
                      {!['g', 'ml'].includes(unit) && (
                        <button
                          type="button"
                          onClick={() => setAmount(prev => {
                            const val = parseFloat(prev) || 0;
                            return Math.max(0, val - 1).toString();
                          })}
                          className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-[#7B61FF] rounded-lg transition-all active:scale-90"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                        </button>
                      )}
                      <div className="flex-1 flex items-baseline justify-center gap-1 min-w-0">
                        <input
                          type="number"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className={`bg-transparent text-slate-800 font-black outline-none min-w-0 ${!['g', 'ml'].includes(unit) ? 'text-xl w-full text-center' : 'text-2xl text-right w-20'}`}
                        />
                        {['g', 'ml'].includes(unit) && (
                          <span className="text-xs font-bold text-slate-300 uppercase shrink-0">
                            {unit}
                          </span>
                        )}
                      </div>
                      {!['g', 'ml'].includes(unit) && (
                        <button
                          type="button"
                          onClick={() => setAmount(prev => {
                            const val = parseFloat(prev) || 0;
                            return (val + 1).toString();
                          })}
                          className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-[#7B61FF] rounded-lg transition-all active:scale-90"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-400 mb-2">Unidad</span>
                    <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-transparent text-sm font-black text-slate-800 capitalize outline-none cursor-pointer">
                      <option value="g">Gramos (g)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="ración">Ración</option>
                      <option value="unidad">Unidad</option>
                      <option value="vaso">Vaso</option>
                      <option value="lata">Lata</option>
                    </select>
                  </div>
                </div>

                {['ración', 'unidad', 'vaso', 'lata'].includes(unit) && (
                  <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-100 animate-fadeIn flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Peso de 1 {unit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <input
                         type="number"
                         required
                         placeholder="Ej: 150"
                         value={servingWeight}
                         onChange={(e) => setServingWeight(e.target.value)}
                         className="flex-1 bg-white text-slate-800 px-3 py-2 rounded-xl font-black text-base border border-amber-200 outline-none"
                       />
                       <span className="text-xs font-bold text-amber-500">g/ml</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Calorías */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col justify-between mt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Energía (Kcal)</span>
                  <span className="text-[9px] font-bold text-slate-400 text-right w-1/2 leading-tight">para {amount} {unit}</span>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  value={calories}
                  onChange={(e) => handleManualCal(e.target.value)}
                  className="w-full bg-white text-slate-800 p-3 rounded-xl font-black text-base text-center border border-slate-100 focus:border-[#FF5C00]/20 focus:ring-4 focus:ring-[#FF5C00]/5 transition-all outline-none"
                />
              </div>

            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Prot', val: protein, color: 'blue', fn: handleManualP },
                { label: 'Carb', val: carbs, color: 'green', fn: handleManualC },
                { label: 'Fat', val: fats, color: 'orange', fn: handleManualF },
              ].map(m => (
                <div key={m.label} className={`bg-slate-50 p-3 rounded-2xl border border-slate-100`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[8px] font-black text-${m.color}-400 uppercase tracking-widest`}>{m.label}</span>
                    <div className={`w-1.5 h-1.5 rounded-full bg-${m.color}-400`}></div>
                  </div>
                  <input
                    type="number"
                    value={m.val}
                    onChange={(e) => m.fn(e.target.value)}
                    className="w-full bg-transparent text-slate-800 font-black text-sm outline-none text-center"
                  />
                </div>
              ))}
            </div>

            {/* Micro Macros */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Azúcar (g)', val: sugar, icon: '🍬', color: 'pink', fn: handleManualSugar },
                { label: 'Sal (g)', val: salt, icon: '🧂', color: 'slate', fn: handleManualSalt },
              ].map(m => (
                <div key={m.label} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all focus-within:bg-white focus-within:border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs">{m.icon}</span>
                    <span className={`text-[9px] font-black text-slate-400 uppercase tracking-widest`}>{m.label}</span>
                  </div>
                  <input
                    type="number"
                    value={m.val}
                    onChange={(e) => m.fn(e.target.value)}
                    placeholder="0"
                    className={`w-full bg-transparent text-slate-800 font-black text-lg outline-none text-center ${m.color === 'pink' ? 'text-pink-500' : 'text-slate-600'}`}
                  />
                </div>
              ))}
            </div>

            {/* Community Info Banner */}
            <div className="bg-[#7B61FF]/5 p-5 rounded-3xl border-2 border-[#7B61FF]/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">🌍</div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7B61FF]">Contribución Comunitaria</p>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5 leading-relaxed">
                  Este alimento se compartirá con la comunidad para ayudar a otros usuarios con datos reales y verificados. 🤝✨
                </p>
              </div>
            </div>

          </form>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 animate-fadeIn">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">⚠️</div>
                <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">¿Estás seguro?</h3>
                <p className="text-sm font-bold text-slate-400 leading-relaxed">
                  Estás a punto de modificar un alimento de la <span className="text-[#7B61FF]">comunidad</span>. Estos cambios serán visibles para todos los usuarios.
                </p>
              </div>
              <div className="p-6 bg-slate-50 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    handleSubmit({ preventDefault: () => {} } as any)
                  }}
                  className="w-full bg-[#7B61FF] text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-100 active:scale-95 transition-all"
                >
                  Confirmar y Guardar
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full bg-white text-slate-400 font-black py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
          <button
            type="submit"
            form="manual-entry-form"
            disabled={isSaving || !name || !calories}
            className="w-full bg-[#7B61FF] hover:bg-[#684DEC] disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-lg py-5 rounded-[2.5rem] shadow-xl shadow-purple-200 hover:shadow-2xl hover:shadow-purple-200/50 transition-all active:scale-[0.98] flex justify-center items-center gap-3"
          >
            {isSaving ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{initialData?.id ? 'Actualizar en Comunidad' : 'Registrar en Comunidad'}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
