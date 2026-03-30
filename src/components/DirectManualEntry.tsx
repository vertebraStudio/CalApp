import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface DirectManualEntryProps {
  onClose: () => void
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


export default function DirectManualEntry({ onClose, initialData }: DirectManualEntryProps) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [sugar, setSugar] = useState('')
  const [salt, setSalt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Scanning states
  const fileRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)

  // Portion Size states
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

  // Unified Upload Handler
  const uploadImage = async (file: File) => {
    if (!user) return null;
    setIsScanning(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const path = `${user.id}/${fileName}`;

      console.log('Iniciando subida de imagen:', path);

      const { error: uploadErr } = await supabase.storage
        .from('food-images')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) {
        console.error('Error al subir a Storage:', uploadErr);
        alert(`Error al subir imagen: ${uploadErr.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(path);

      console.log('Imagen subida con éxito. URL:', publicUrl);
      setImageUrl(publicUrl);
      return publicUrl;
    } catch (err) {
      console.error('Error inesperado en uploadImage:', err);
      return null;
    } finally {
      setIsScanning(false);
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

        const { error: globalErr } = await supabase
          .from('global_foods')
          .upsert([foodData])

        if (globalErr) {
          console.error('Error al guardar en comunidad:', globalErr)
          alert(`Error al guardar: ${globalErr.message}`)
        } else {
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn pb-24 sm:pb-6">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-slideUp">

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
                  if (file) uploadImage(file);
                }} />
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">📸</div>
                <div className="text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Foto del Producto</p>
                  <p className="text-[10px] text-slate-300 font-bold mt-1">Añade una carátula para la comunidad</p>
                </div>
                {isScanning && (
                  <div className="absolute inset-0 bg-white/90 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 animate-fadeIn z-10">
                    <div className="w-8 h-8 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase text-[#7B61FF]">Subiendo...</span>
                  </div>
                )}
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
                  className="w-full bg-slate-50 text-slate-800 px-4 py-4 rounded-2xl font-black text-sm uppercase tracking-wider placeholder:text-slate-300 border-2 border-transparent focus:border-[#7B61FF]/10 focus:bg-white transition-all outline-none"
                />
              </div>

              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Marca (Ej: Hacendado, Danone...)"
                className="w-full bg-slate-50 text-slate-800 px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest placeholder:text-slate-300 border-2 border-transparent focus:border-slate-100 focus:bg-white transition-all outline-none"
              />

              {/* Optional AI Scan Button */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full bg-slate-50/50 hover:bg-slate-100/50 border border-slate-100 py-3 rounded-xl flex items-center justify-center gap-2 group transition-all active:scale-[0.98]"
              >
                <svg className="w-4 h-4 text-slate-400 group-hover:text-[#7B61FF] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-slate-600">Autocompletar con ticket</span>
                  <span className="text-[8px] font-bold text-slate-300 group-hover:text-slate-400">(Opcional)</span>
                </div>
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
                  required
                  value={calories}
                  onChange={(e) => handleManualCal(e.target.value)}
                  className="w-full bg-white text-slate-800 px-4 py-3 rounded-2xl font-black text-3xl border-2 border-transparent focus-within:border-[#7B61FF]/10 shadow-sm outline-none text-center"
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
