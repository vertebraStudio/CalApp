import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import ManualSearch from '../ManualSearch'
import ImageUpload from '../ImageUpload'
import VoiceTextEntry from '../VoiceTextEntry'
import DirectManualEntry from '../DirectManualEntry'
import AddToFridge from '../AddToFridge'
import { useSaveMealEntry } from '@/hooks/useSaveMealEntry'

const navItemsStart = [
  {
    to: '/',
    label: 'Hoy',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-[#FFF156]' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/nevera',
    label: 'Nevera',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-[#FFF156]' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z M5 10h14 M9 6v2 M9 13v3" />
      </svg>
    ),
  },
]

const navItemsEnd = [
  {
    to: '/profile',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-[#FFF156]' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function Navbar() {
  const location = useLocation()
  const hidePlusButton = location.pathname === '/profile' || location.pathname === '/nevera'
  const { saveMeal } = useSaveMealEntry()
  const [showManual, setShowManual] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [showDirect, setShowDirect] = useState(false)
  const [showFridgeAdd, setShowFridgeAdd] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  
  // Shared data for the central smart form
  const [sharedData, setSharedData] = useState<any>(null)

  useEffect(() => {
    const handleOpenFridge = () => setShowFridgeAdd(true)
    window.addEventListener('open-fridge-add', handleOpenFridge)
    return () => window.removeEventListener('open-fridge-add', handleOpenFridge)
  }, [])

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#5A43B2] border-t-2 border-black/20 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.2)]">
        <div className="max-w-2xl mx-auto px-4 h-20 relative">
          
          {/* 4-Column Grid for Symmetric Alignment */}
          <div className="grid grid-cols-4 w-full items-center h-full relative px-2">
            
            {/* Slot 1: Hoy */}
            <div className="flex justify-center">
              <NavLink to="/" end className="flex flex-col items-center gap-1 transition-all active:scale-95 group">
                {({ isActive }) => (
                  <>
                    {navItemsStart[0].icon(isActive)}
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-[#FFF156]' : 'text-white/40'}`}>
                      {navItemsStart[0].label}
                    </span>
                  </>
                )}
              </NavLink>
            </div>

            {/* Slot 2: Nevera */}
            <div className="flex justify-center">
              <NavLink to="/nevera" className="flex flex-col items-center gap-1 transition-all active:scale-95 group">
                {({ isActive }) => (
                  <>
                    {navItemsStart[1].icon(isActive)}
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-[#FFF156]' : 'text-white/40'}`}>
                      {navItemsStart[1].label}
                    </span>
                  </>
                )}
              </NavLink>
            </div>

            {/* Slot 3: Contribuir (Manual Entry) */}
            <div className="flex justify-center">
              <button 
                onClick={() => { setShowDirect(true); setSharedData(null); }}
                className="flex flex-col items-center gap-1 transition-all active:scale-95 group"
              >
                <div className="relative">
                  <svg className={`w-6 h-6 ${showDirect ? 'text-[#FFF156]' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${showDirect ? 'text-[#FFF156]' : 'text-white/40'}`}>
                  Contribuir
                </span>
              </button>
            </div>

            {/* Slot 4: Perfil */}
            <div className="flex justify-center">
              <NavLink to="/profile" className="flex flex-col items-center gap-1 transition-all active:scale-95 group">
                {({ isActive }) => (
                  <>
                    {navItemsEnd[0].icon(isActive)}
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-[#FFF156]' : 'text-white/40'}`}>
                      {navItemsEnd[0].label}
                    </span>
                  </>
                )}
              </NavLink>
            </div>

          </div>
        </div>
      </nav>

      {/* Floating FAB - Independent of the nav tray, centered at 50% */}
      {!hidePlusButton && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 flex flex-col items-center z-[51]">
          
          {/* FAB Options (Radial) */}
          {showPlusMenu && (
            <div className="absolute top-1/2 left-1/2 w-0 h-0 z-0">
              {/* Cámara */}
              <button
                onClick={() => { setShowPlusMenu(false); alert('Estará listo próximamente'); }}
                className="absolute flex flex-col items-center group w-16 animate-popIn"
                style={{ '--tx': '-70px', '--ty': '-70px' } as any}
              >
                <div className="w-14 h-14 rounded-full bg-[#FFF156] text-black flex items-center justify-center border-2 border-black group-active:scale-95 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </div>
              </button>

              {/* Buscador (CENTRO) */}
              <button
                onClick={() => { setShowPlusMenu(false); setShowManual(true) }}
                className="absolute flex flex-col items-center group w-16 animate-popIn"
                style={{ '--tx': '0px', '--ty': '-100px', animationDelay: '80ms' } as any}
              >
                <div className="w-14 h-14 rounded-full bg-[#FFF156] text-black flex items-center justify-center border-2 border-black group-active:scale-95 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </button>

              {/* Voz/Texto */}
              <button
                onClick={() => { setShowPlusMenu(false); alert('Estará listo próximamente'); }}
                className="absolute flex flex-col items-center group w-16 animate-popIn"
                style={{ '--tx': '70px', '--ty': '-70px', animationDelay: '160ms' } as any}
              >
                <div className="w-14 h-14 rounded-full bg-[#FFF156] text-black flex items-center justify-center border-2 border-black group-active:scale-95 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`relative z-10 w-16 h-16 rounded-full border-2 border-black text-black flex items-center justify-center transition-all duration-300 active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${showPlusMenu ? 'rotate-45 bg-[#FFF156]' : 'bg-[#FFF156]'}`}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      )}

      {/* global Modals Triggered by FAB */}
      {showUpload && <ImageUpload onClose={() => setShowUpload(false)} onAnalysisComplete={(data: any) => { setShowUpload(false); setSharedData(data); setShowDirect(true); }} />}
      {showVoice && <VoiceTextEntry onClose={() => setShowVoice(false)} onAnalysisComplete={(data: any) => { setShowVoice(false); setSharedData(data); setShowDirect(true); }} />}
      {showManual && (
        <ManualSearch 
          onClose={() => setShowManual(false)} 
          onFoodSelected={async (data: any) => { 
            setShowManual(false); 
            await saveMeal(data);
          }} 
          onEditFood={(food) => {
            setShowManual(false);
            setSharedData({
              id: food.food_id,
              food_name: food.food_name,
              brand_name: food.brand_name,
              categoria: food.categoria,
              calories: food.params_per_100g.calories,
              macros: {
                p: food.params_per_100g.macros.p,
                c: food.params_per_100g.macros.c,
                f: food.params_per_100g.macros.f,
                sugar: food.params_per_100g.macros.sugar,
                salt: food.params_per_100g.macros.salt
              },
              image_url: food.image_url,
              serving_size_g: food.serving_size_g,
              serving_unit: food.serving_unit,
              base_unit: food.base_unit
            });
            setShowDirect(true);
          }}
        />
      )}
      {showDirect && <DirectManualEntry 
        initialData={sharedData} 
        onClose={() => { setShowDirect(false); setSharedData(null); }} 
        onSuccess={async (_foodId, diaryEntry) => {
          // Calculate Default Meal Type based on time (duplicated logic from ManualSearch for now)
          const hour = new Date().getHours()
          let defaultType: 'breakfast' | 'lunch' | 'snack' | 'dinner' = 'lunch'
          if (hour >= 5 && hour < 11) defaultType = 'breakfast'
          else if (hour >= 11 && hour < 16) defaultType = 'lunch'
          else if (hour >= 16 && hour < 20) defaultType = 'snack'
          else defaultType = 'dinner'

          const ok = await saveMeal({
            ...diaryEntry,
            meal_type: diaryEntry.meal_type || defaultType
          })
          
          if (ok) {
            setShowDirect(false)
            setSharedData(null)
          } else {
            alert('El alimento se guardó en la comunidad pero no se pudo registrar tu ingesta. Revisa tu conexión.')
          }
        }}
      />}
      {showFridgeAdd && (
        <AddToFridge 
          onClose={() => {
            setShowFridgeAdd(false)
            window.dispatchEvent(new Event('fridge-updated'))
          }} 
        />
      )}
    </>
  )
}
