import { useState, useEffect } from 'react'
import { useFridge } from '@/hooks/useFridge'
import type { FridgeItem } from '@/types'

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

// --- Sub-componente: Tarjeta de Alimento ---
function FridgeCard({ item, onUpdateStock }: {
  item: FridgeItem
  onUpdateStock: (id: string, amount: number) => void
}) {
  const stock = item.stock_amount
  const unit = item.stock_unit


  return (
    <div className={`relative bg-white rounded-2xl border-2 border-black shadow-sm transition-all ${stock <= 0 ? 'border-red-400' : 'border-black'}`}>
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        {/* Info Section */}
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-slate-800 text-base truncate capitalize leading-tight">{item.name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.food?.brand_name && item.food.brand_name.toLowerCase() !== 'generico' && item.food.brand_name.toLowerCase() !== 'genérico' && (
              <>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.food.brand_name}</span>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">·</span>
              </>
            )}
            <span className="text-[9px] font-black text-[#7B61FF]/60 uppercase tracking-widest flex items-center gap-1">
              <span>{CATEGORIES.find(c => c.id === item.food?.categoria)?.icon || '🛒'}</span>
              <span>{item.food?.categoria || 'Sin Cat.'}</span>
            </span>
          </div>
        </div>

        {/* Stock Display */}
        <div className="flex flex-col items-end min-w-[3rem]">
          <span className="text-xl font-black text-[#7B61FF] leading-none">{stock}</span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{unit === 'g' || unit === 'ml' ? unit : 'uds'}</span>
        </div>

        {/* Buttons Section */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onUpdateStock(item.id, Math.max(0, stock - 1))}
            className="w-10 h-10 rounded-xl bg-white border-2 border-black text-slate-600 font-bold flex items-center justify-center transition-all active:bg-slate-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 12H6" />
            </svg>
          </button>
          <button
            onClick={() => onUpdateStock(item.id, stock + 1)}
            className="w-10 h-10 rounded-xl bg-[#7B61FF] text-white border-2 border-black font-bold flex items-center justify-center transition-all active:bg-[#6a53e6]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v12m6-6H6" />
            </svg>
          </button>
        </div>
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
    const matchesQuery =
      i.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (i.food?.brand_name || '').toLowerCase().includes(filterQuery.toLowerCase())
    const matchesCategory = !selectedCategory || i.food?.categoria === selectedCategory
    return matchesQuery && matchesCategory
  })

  const lowStockThreshold = 100
  const lowStockCount = items.filter(i => i.stock_amount <= lowStockThreshold).length

  return (
    <div className="h-screen flex flex-col bg-[#7B61FF] -mx-4 -mt-6 overflow-hidden">
      {/* Header Section */}
      <div className="px-6 pt-12 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="pt-1.5">
              <h1 className="text-3xl font-black text-white tracking-tighter leading-none">Mi Nevera 🧊</h1>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mt-2">Gestión de Inventario</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
              >
                <span className="text-2xl">🛒</span>
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-fridge-add'))}
                className="w-12 h-12 bg-[#FFF156] text-black rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-[24px] p-3.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Ítems</p>
              <p className="text-2xl font-black text-slate-800 tracking-tighter">{items.length}</p>
            </div>
            <div className={`rounded-[24px] p-3.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${lowStockCount > 0 ? 'bg-[#FFF156]' : 'bg-white'
              }`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${lowStockCount > 0 ? 'text-slate-700' : 'text-slate-400'
                }`}>Stock Bajo</p>
              <p className={`text-2xl font-black tracking-tighter ${lowStockCount > 0 ? 'text-slate-900' : 'text-slate-800'
                }`}>{lowStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#FFF156] rounded-t-[3rem] border-t-4 border-black flex flex-col overflow-hidden">
        {/* Sticky Filters Area */}
        <div className="shrink-0 max-w-lg mx-auto w-full px-6 pt-8 pb-2 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#7B61FF]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Filtrar por nombre o marca..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className="w-full bg-slate-50 pl-14 pr-5 py-4 rounded-2xl font-bold text-slate-600 border-2 border-black focus:border-[#7B61FF] outline-none transition-all placeholder:text-slate-300"
            />
          </div>

          {/* Category Filter */}
          <div className="flex overflow-x-auto gap-2 no-scrollbar py-1 -mx-6 px-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-black ${!selectedCategory
                ? 'bg-[#7B61FF] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white text-black'
                }`}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-black ${selectedCategory === cat.id
                  ? 'bg-[#7B61FF] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-black'
                  }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Items Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-40">
          <div className="max-w-lg mx-auto py-4">
            {isLoading ? (
              <div className="flex flex-col items-center py-24 gap-4 animate-fadeIn">
                <div className="w-10 h-10 border-4 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Escaneando Inventario...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center py-24 gap-6 text-center animate-slideUp">
                <div className="w-24 h-24 bg-[#7B61FF] rounded-[32px] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-5xl">
                  📦
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Nada por aquí</h2>
                  <p className="text-xs text-slate-600 font-bold max-w-xs mt-2 uppercase tracking-wide">
                    {filterQuery ? 'No hay resultados para tu búsqueda' : 'Compra algo o nos moriremos de hambre :('}
                  </p>
                </div>
                {!filterQuery && (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-fridge-add'))}
                    className="bg-[#7B61FF] text-white border-2 border-black font-black px-8 py-4 rounded-[1.5rem] text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
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
                      if (amount <= 0) {
                        await removeItem(id)
                      } else {
                        await updateStock(id, amount)
                      }
                      loadItems()
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
