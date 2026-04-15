import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#8060FF] selection:bg-white/20 selection:text-white relative overflow-hidden">
      {/* Top Section - Logo & Image */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fadeIn relative z-10">
        <div className="text-center flex flex-col items-center">
          <img 
            src="/GorditoCaratula.png" 
            alt="Gordito" 
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain mb-8 animate-float"
          />
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2 drop-shadow-sm">Gordito</h1>
          <p className="text-white/70 font-bold text-xs uppercase tracking-widest">La vida no está hecha para contar calorías</p>
        </div>
      </div>

      {/* Bottom Section - Login Card */}
      <div className="w-full max-w-md mx-auto animate-slideUp relative z-20">
        <div className="bg-[#FFF156] rounded-t-[2.5rem] sm:rounded-[2.5rem] px-8 pt-10 pb-12 sm:pb-8 sm:mb-8 sm:p-8 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] sm:shadow-2xl sm:shadow-black/10 space-y-8 relative border-t-2 sm:border-2 border-black">

          {/* Mobile Handle */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/10 rounded-full sm:hidden"></div>

          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl font-black text-slate-900">¡Vamos al lío!</h2>
            <p className="text-sm font-bold text-slate-800/60">Entra para seguir tu progreso diario</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-[10px] font-black text-slate-900 uppercase tracking-widest pl-1">Email</label>
              <div className="relative group">
                <input
                  id="login-email"
                  type="email"
                  className="w-full bg-slate-50 border-2 border-black focus:border-[#7B61FF] focus:bg-white rounded-2xl px-5 py-4 text-slate-800 font-bold placeholder:text-slate-300 outline-none transition-all duration-300"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B61FF] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-[10px] font-black text-slate-900 uppercase tracking-widest pl-1">Contraseña</label>
              <div className="relative group">
                <input
                  id="login-password"
                  type="password"
                  className="w-full bg-slate-50 border-2 border-black focus:border-[#7B61FF] focus:bg-white rounded-2xl px-5 py-4 text-slate-800 font-bold placeholder:text-slate-300 outline-none transition-all duration-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B61FF] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-100 text-red-500 text-[11px] font-bold px-4 py-3 rounded-2xl animate-shake">
                ⚠️ {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className="w-full bg-[#7B61FF] hover:bg-[#684DEC] text-white rounded-2xl py-4 text-base font-black border-2 border-black transition-all active:scale-[0.98] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="text-center text-slate-900 text-xs font-bold pt-4 uppercase tracking-widest">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-[#7B61FF] hover:underline transition-all">
              Crear una ahora
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
