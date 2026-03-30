import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFridgeItems, FRIDGE_CATEGORIES } from '@/hooks/useFridgeItems'
import type { FridgeItem } from '@/hooks/useFridgeItems'
import ShoppingEntry from '@/components/ShoppingEntry'

// --- Helper: Categoría Icono ---
const CATEGORY_ICONS: Record<string, string> = {
  'Proteínas': '🥩',
  'Lácteos': '🥛',
  'Vegetales': '🥦',
  'Frutas': '🍎',
  'Cereales': '🌾',
  'Despensa': '🫙',
  'Bebidas': '🧃',
  'Otros': '📦',
}

// --- Sub-componente: Tarjeta de Alimento ---
function FridgeCard({ item, onUpdateStock, onDelete }: {
  item: FridgeItem
  onUpdateStock: (id: string, amount: number) => void
  onDelete: (id: string) => void
}) {
  const isLow = item.stock_amount <= item.low_stock_threshold
  const isEmpty = item.stock_amount <= 0
  const pct = isEmpty ? 0 : Math.min(100, (item.stock_amount / (item.low_stock_threshold * 4)) * 100)

  const stockColor = isEmpty ? 'bg-red-400' : isLow ? 'bg-orange-400' : 'bg-[#5BC897]'
  const stockBg = isEmpty ? 'bg-red-50' : isLow ? 'bg-orange-50' : 'bg-emerald-50'
  const stockText = isEmpty ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-[#5BC897]'

  return (
    <div className={`relative bg-white rounded-2xl border overflow-hidden transition-all ${
      isEmpty ? 'border-red-100' : isLow ? 'border-orange-100' : 'border-slate-100'
    }`}>
      {/* Stock bar at top */}
      <div className="h-1 bg-slate-100">
        <div
          className={`h-full transition-all duration-500 rounded-full ${stockColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800 text-sm truncate capitalize">{item.name}</h4>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">{item.category}</span>
          </div>
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shrink-0">
              {CATEGORY_ICONS[item.category] ?? '🍽️'}
            </div>
          )}
        </div>

        {/* Macros per 100g */}
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[
            { label: 'kcal', value: Math.round(item.calories_per_100g), color: 'text-violet-500' },
            { label: 'P', value: `${item.protein_per_100g}g`, color: 'text-blue-500' },
            { label: 'C', value: `${item.carbs_per_100g}g`, color: 'text-green-500' },
            { label: 'G', value: `${item.fats_per_100g}g`, color: 'text-orange-500' },
          ].map(m => (
            <div key={m.label} className="text-center bg-slate-50 rounded-lg py-1">
              <p className={`text-[10px] font-black ${m.color}`}>{m.value}</p>
              <p className="text-[9px] text-slate-400 font-semibold">{m.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-slate-300 text-right -mt-2 mb-2 font-medium">por 100g</p>

        {/* Stock */}
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${stockBg} mb-3`}>
          <div>
            {isEmpty && (
              <span className="text-[10px] font-black text-red-500 uppercase tracking-wide">⚠ Agotado</span>
            )}
            {isLow && !isEmpty && (
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-wide">⚠ Stock bajo</span>
            )}
            {!isLow && !isEmpty && (
              <span className="text-[10px] font-bold text-slate-400">Stock</span>
            )}
            <p className={`text-sm font-black ${stockText}`}>
              {item.stock_amount} <span className="text-xs font-semibold">{item.stock_unit}</span>
            </p>
          </div>
          {/* Quick adjust */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateStock(item.id, Math.max(0, item.stock_amount - (item.stock_unit === 'uds' ? 1 : 50)))}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold text-sm flex items-center justify-center hover:border-slate-300 transition-colors active:scale-95"
            >−</button>
            <button
              onClick={() => onUpdateStock(item.id, item.stock_amount + (item.stock_unit === 'uds' ? 1 : 50))}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold text-sm flex items-center justify-center hover:border-slate-300 transition-colors active:scale-95"
            >+</button>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(item.id)}
          className="w-full text-[10px] font-bold text-slate-300 hover:text-red-400 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

// --- Sub-componente: Formulario Añadir ---
function AddItemModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (item: any) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Despensa')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [stockAmount, setStockAmount] = useState('100')
  const [stockUnit, setStockUnit] = useState('g')
  const [lowThreshold, setLowThreshold] = useState('100')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAutoFill = async () => {
    if (!name.trim()) return
    setIsAnalyzing(true)
    try {
      const { data } = await supabase.functions.invoke('analyze-food', {
        body: { text_description: `100g de ${name}` }
      })
      if (data) {
        setCalories(Math.round(data.calories || 0).toString())
        setProtein((data.macros?.p || 0).toString())
        setCarbs((data.macros?.c || 0).toString())
        setFats((data.macros?.f || 0).toString())
      }
    } catch (e) { console.error(e) }
    finally { setIsAnalyzing(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    onAdd({
      name: name.trim(),
      category,
      image_url: null,
      calories_per_100g: parseFloat(calories) || 0,
      protein_per_100g: parseFloat(protein) || 0,
      carbs_per_100g: parseFloat(carbs) || 0,
      fats_per_100g: parseFloat(fats) || 0,
      stock_amount: parseFloat(stockAmount) || 0,
      stock_unit: stockUnit,
      low_stock_threshold: parseFloat(lowThreshold) || 100,
    })
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 pb-24 sm:pb-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800">Añadir Alimento</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Añade un ítem a tu nevera</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="add-fridge-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre + AI */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Alimento</label>
              <div className="relative">
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ej: Pechuga de pollo"
                  className="w-full bg-slate-50 text-slate-800 pl-4 pr-12 py-3 rounded-2xl font-semibold text-sm border-2 border-transparent focus:border-[#7B61FF]/30 focus:bg-white transition-all outline-none"
                />
                <button type="button" onClick={handleAutoFill} disabled={isAnalyzing || !name.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#7B61FF] text-white rounded-xl disabled:opacity-40 transition-colors"
                >
                  {isAnalyzing
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  }
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 px-1">Pulsa ✨ para auto-rellenar macros con IA</p>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Categoría</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 pl-4 pr-8 py-3 rounded-2xl font-semibold text-sm border-2 border-transparent focus:border-[#7B61FF]/30 transition-all outline-none appearance-none">
                  {FRIDGE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Macros por 100g */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Macros por 100g</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'kcal', state: calories, setState: setCalories },
                  { label: 'Prot (g)', state: protein, setState: setProtein },
                  { label: 'Carbs (g)', state: carbs, setState: setCarbs },
                  { label: 'Grasas (g)', state: fats, setState: setFats },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{f.label}</p>
                    <input type="number" value={f.state} onChange={e => f.setState(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-slate-800 font-bold text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Stock Actual</label>
              <div className="flex gap-2">
                <input type="number" value={stockAmount} onChange={e => setStockAmount(e.target.value)} min="0"
                  placeholder="0"
                  className="flex-1 bg-slate-50 text-slate-800 px-4 py-3 rounded-2xl font-bold text-sm border-2 border-transparent focus:border-[#7B61FF]/30 transition-all outline-none" />
                <div className="relative">
                  <select value={stockUnit} onChange={e => setStockUnit(e.target.value)}
                    className="bg-slate-50 text-slate-800 pl-3 pr-8 py-3 rounded-2xl font-semibold text-sm border-2 border-transparent focus:border-[#7B61FF]/30 transition-all outline-none appearance-none">
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="uds">uds</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Umbral alerta */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Alerta de Stock Bajo ({'<'} valor)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={lowThreshold} onChange={e => setLowThreshold(e.target.value)} min="0"
                  className="flex-1 bg-slate-50 text-slate-800 px-4 py-3 rounded-2xl font-bold text-sm border-2 border-transparent focus:border-[#7B61FF]/30 transition-all outline-none" />
                <span className="text-sm text-slate-400 font-semibold">{stockUnit}</span>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 shrink-0">
          <button form="add-fridge-form" type="submit"
            className="w-full bg-[#7B61FF] hover:bg-[#684DEC] text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-[0.98]">
            Añadir a la Nevera 🧊
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Página Principal ---
export default function FridgePage() {
  const { items, isLoading, addItem, updateStock, deleteItem } = useFridgeItems()
  const [showAdd, setShowAdd] = useState(false)
  const [showShopping, setShowShopping] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const handleAddBulk = async (newItems: any[]) => {
    for (const item of newItems) {
      await addItem.mutateAsync({ ...item, image_url: null })
    }
    setShowShopping(false)
  }

  const grouped = items.reduce<Record<string, FridgeItem[]>>((acc, item) => {
    if (filterCategory && item.category !== filterCategory) return acc
    ;(acc[item.category] = acc[item.category] || []).push(item)
    return acc
  }, {})

  const lowStockCount = items.filter(i => i.stock_amount <= i.low_stock_threshold).length

  return (
    <div className="min-h-screen bg-[#F8F9FE] -mx-4 -mt-6 pb-36">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 pt-12 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mi Nevera 🧊</h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                {items.length} producto{items.length !== 1 ? 's' : ''}
                {lowStockCount > 0 && (
                  <span className="ml-2 text-orange-500 font-bold">
                    · {lowStockCount} con stock bajo
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowShopping(true)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-2xl transition-all active:scale-95"
              >
                🛒 Cargar
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 bg-[#7B61FF] hover:bg-[#684DEC] text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-purple-200 transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Añadir
              </button>
            </div>
          </div>

          {/* Category filters */}
          {items.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterCategory(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  !filterCategory ? 'bg-[#7B61FF] text-white border-[#7B61FF]' : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                Todos
              </button>
              {[...new Set(items.map(i => i.category))].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    filterCategory === cat ? 'bg-[#7B61FF] text-white border-[#7B61FF]' : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {CATEGORY_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-medium text-sm">Cargando tu nevera...</p>
          </div>
        ) : items.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="text-6xl">🧊</div>
            <h2 className="text-xl font-black text-slate-700">Tu nevera está vacía</h2>
            <p className="text-sm text-slate-400 font-medium max-w-xs">
              Empieza añadiendo los alimentos que tienes en casa para hacer seguimiento de tu despensa.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 bg-[#7B61FF] text-white font-bold px-6 py-3 rounded-2xl shadow-md shadow-purple-100 transition-all active:scale-95 hover:bg-[#684DEC]"
            >
              Añadir primer alimento
            </button>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-medium text-sm">
            No hay alimentos en esta categoría.
          </div>
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{CATEGORY_ICONS[category] ?? '🍽️'}</span>
                <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest">{category}</h2>
                <span className="text-xs text-slate-300 font-bold">({catItems.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {catItems.map(item => (
                  <FridgeCard
                    key={item.id}
                    item={item}
                    onUpdateStock={(id, amount) => updateStock.mutate({ id, stock_amount: amount })}
                    onDelete={(id) => deleteItem.mutate(id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdd={data => {
            addItem.mutate(data, { onSuccess: () => setShowAdd(false) })
          }}
        />
      )}

      {showShopping && (
        <ShoppingEntry
          onClose={() => setShowShopping(false)}
          onAddItems={handleAddBulk}
        />
      )}
    </div>
  )
}
