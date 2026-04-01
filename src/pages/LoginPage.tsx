import { useState } from 'react'
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F9FE] selection:bg-[#7B61FF]/10 selection:text-[#7B61FF]">
      <div className="w-full max-w-sm animate-fadeIn">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-white shadow-xl shadow-purple-100/50 mb-6 group transition-all hover:scale-105 active:scale-95">
            <span className="text-4xl group-hover:animate-bounce">🥗</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">Gordito</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Alimentación Inteligente ✨</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-purple-100/20 border border-white space-y-8 animate-slideUp">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800">Bienvenido de nuevo</h2>
            <p className="text-sm font-medium text-slate-400">Entra para seguir tu progreso diario</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
              <div className="relative group">
                <input
                  id="login-email"
                  type="email"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#7B61FF] focus:bg-white rounded-2xl px-5 py-4 text-slate-800 font-bold placeholder:text-slate-300 outline-none transition-all duration-300"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#7B61FF] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contraseña</label>
              <div className="relative group">
                <input
                  id="login-password"
                  type="password"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#7B61FF] focus:bg-white rounded-2xl px-5 py-4 text-slate-800 font-bold placeholder:text-slate-300 outline-none transition-all duration-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#7B61FF] transition-colors">
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
              className="w-full bg-[#7B61FF] hover:bg-[#684DEC] text-white rounded-2xl py-5 text-lg font-black shadow-xl shadow-purple-200 transition-all active:scale-[0.98] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Iniciar Sesión 🚀'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs font-bold mt-10 uppercase tracking-widest">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-[#7B61FF] hover:underline transition-all">
            Crear una ahora ✨
          </Link>
        </p>
      </div>
    </div>
  )
}
