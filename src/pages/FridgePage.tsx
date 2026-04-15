import React, { useState, useEffect } from 'react'
import { useFridge } from '@/hooks/useFridge'
import type { FridgeItem } from '@/types'

// --- Sub-componente: Tarjeta de Alimento ---
function FridgeCard({ item, onUpdateStock, onDelete }: {
  item: FridgeItem
  onUpdateStock: (id: string, amount: number) => void
  onDelete: (id: string) => void
}) {
  const stock = item.stock_amount
  const unit = item.stock_unit
  
  // Expiration logic
  const isExpired = item.expiration_date ? new Date(item.expiration_date) < new Date() : false
  const expDateStr = item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : null

  return (
    <div className={`relative bg-white rounded-[2.5rem] border-2 shadow-sm transition-all ${
      stock <= 0 ? 'border-red-100 opacity-80' : 'border-slate-100'
    }`}>
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-slate-800 text-base truncate capitalize leading-tight mb-1">{item.name}</h4>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                {item.food?.brand_name || 'Genérico'}
              </span>
              {expDateStr && (
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${isExpired ? 'bg-red-50 text-red-500 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                  <span>⌛</span>
                  <span>{isExpired ? 'Caducado' : expDateStr}</span>
                </span>
              )}
            </div>
          </div>
          {item.image_url ? (
            <div className="relative">
              <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-[1.5rem] object-cover shrink-0 shadow-md border-4 border-white" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-100 flex items-center justify-center text-3xl shrink-0">
              🍲
            </div>
          )}
        </div>

        {/* Stock Management - Focus on Units */}
        <div className={`flex items-center justify-between p-4 rounded-3xl ${stock <= 0 ? 'bg-red-50/50' : 'bg-slate-50/80 border border-slate-100'} mb-4`}>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">En Stock</span>
            <p className={`text-xl font-black ${stock <= 0 ? 'text-red-500 text-lg' : 'text-slate-800'}`}>
              {stock <= 0 ? 'Agotado' : stock} <span className="text-xs font-bold text-slate-400 uppercase ml-0.5">{unit === 'g' || unit === 'ml' ? unit : 'uds'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateStock(item.id, Math.max(0, stock - 1))}
              className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 font-bold text-xl flex items-center justify-center transition-all active:scale-90"
            >−</button>
            <button
              onClick={() => onUpdateStock(item.id, stock + 1)}
              className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-[#7B61FF] font-bold text-xl flex items-center justify-center transition-all active:scale-90"
            >+</button>
          </div>
        </div>

        {/* Delete Action */}
        <button
          onClick={() => onDelete(item.id)}
          className="w-full text-[10px] font-black text-slate-300 hover:text-red-400 transition-all uppercase tracking-[0.2em] py-2"
        >
          Retirar de la nevera
        </button>
      </div>
    </div>
  )
}

export default function FridgePage() {
  const { getFridgeItems, updateStock, removeItem } = useFridge()
  const [items, setItems] = useState<FridgeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

  const loadItems = async () => {
    setIsLoading(true)
    const data = await getFridgeItems()
    setItems(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadItems()

    const handleUpdate = () => loadItems()
    window.addEventListener('fridge-updated', handleUpdate)
    return () => window.removeEventListener('fridge-updated', handleUpdate)
  }, [])

  const filteredItems = items.filter(i => {
    const matchesQuery = i.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (i.food?.brand_name || '').toLowerCase().includes(filterQuery.toLowerCase())
    const matchesCategory = !selectedCategory || i.food?.categoria === selectedCategory
    return matchesQuery && matchesCategory
  })

  const lowStockThreshold = 100 // Example threshold
  const lowStockCount = items.filter(i => i.stock_amount <= lowStockThreshold).length

  return (
    <div className="min-h-screen bg-[#F8F9FE] -mx-4 -mt-6 pb-40">
      {/* Header Profile Section */}
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[3.5rem] shadow-sm border-b border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="pt-1.5">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Mi Nevera</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Gestión de Inventario</p>
            </div>
            
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-fridge-add'))}
              className="w-12 h-12 bg-[#7B61FF] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100 active:scale-95 transition-all animate-popIn"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ítems</p>
              <p className="text-2xl font-black text-slate-800">{items.length}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Stock Bajo</p>
              <p className="text-2xl font-black text-orange-600">{lowStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Search/Filter Bar */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Filtrar por nombre o marca..." 
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            className="w-full bg-white p-5 pl-14 rounded-[2rem] font-bold text-slate-600 shadow-sm border border-slate-100 focus:border-[#7B61FF]/30 outline-none transition-all placeholder:text-slate-300"
          />
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-40">🔎</span>
        </div>

        {/* Category Filter */}
        <div className="flex overflow-x-auto gap-2 no-scrollbar py-2 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              !selectedCategory ? 'bg-[#7B61FF] text-white shadow-lg shadow-purple-100 scale-105' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedCategory === cat.id ? 'bg-[#7B61FF] text-white shadow-lg shadow-purple-100 scale-105' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.id}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center py-24 gap-4 animate-fadeIn">
            <div className="w-10 h-10 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Escaneando Inventario...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-6 text-center animate-slideUp">
            <div className="text-6xl grayscale opacity-30">📦</div>
            <div>
              <h2 className="text-xl font-black text-slate-700">Nada por aquí</h2>
              <p className="text-sm text-slate-400 font-bold max-w-xs mt-2 uppercase tracking-wide">
                {filterQuery ? 'No hay resultados para tu búsqueda' : 'Tu nevera personal está vacía'}
              </p>
            </div>
            {!filterQuery && (
              <button
                onClick={() => {
                  // This will be handled by the Navbar button or we can trigger it 
                  // but the user wants the yellow button at the same spot.
                  // For the "Empty State" button, we can still use a local action if needed
                  // but let's keep it consistent:
                  window.dispatchEvent(new CustomEvent('open-fridge-add'))
                }}
                className="bg-white border-2 border-slate-100 text-slate-400 font-black px-8 py-4 rounded-[1.5rem] text-xs uppercase tracking-widest hover:border-[#7B61FF] hover:text-[#7B61FF] transition-all active:scale-95 shadow-sm"
              >
                Registrar primer producto
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
            {filteredItems.map(item => (
              <FridgeCard
                key={item.id}
                item={item}
                onUpdateStock={async (id, amount) => {
                  await updateStock(id, amount)
                  loadItems()
                }}
                onDelete={async (id) => {
                  if (confirm('¿Retirar este alimento de la nevera?')) {
                    await removeItem(id)
                    loadItems()
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
