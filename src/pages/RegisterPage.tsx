import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Crear perfil inicial
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        goal_calories: 2000,
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F9FE]">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-purple-100/20 border border-white text-center max-w-sm w-full animate-fadeIn">
          <div className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 animate-bounce">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">¡Bienvenido a Gordito!</h2>
          <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">Tu cuenta ha sido creada con éxito. Revisa tu email para confirmar.</p>
          <Link to="/login" className="w-full inline-block bg-[#7B61FF] hover:bg-[#684DEC] text-white rounded-2xl py-4 text-lg font-black shadow-xl shadow-purple-200 transition-all active:scale-[0.98]">
            Ir al Login 🚀
          </Link>
        </div>
      </div>
    )
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
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Únete a la revolución ✨</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-purple-100/20 border border-white space-y-8 animate-slideUp">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800">Crea tu cuenta</h2>
            <p className="text-sm font-medium text-slate-400">Empieza tu viaje hacia una vida mejor</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="register-username" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre de usuario</label>
              <div className="relative group">
                <input
                  id="register-username"
                  type="text"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#7B61FF] focus:bg-white rounded-2xl px-5 py-4 text-slate-800 font-bold placeholder:text-slate-300 outline-none transition-all duration-300"
                  placeholder="Ej: JuanNutri"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#7B61FF] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
              <div className="relative group">
                <input
                  id="register-email"
                  type="email"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#7B61FF] focus:bg-white rounded-2xl px-5 py-4 text-slate-800 font-bold placeholder:text-slate-300 outline-none transition-all duration-300"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#7B61FF] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contraseña</label>
              <div className="relative group">
                <input
                  id="register-password"
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
              id="register-submit-btn"
              type="submit"
              className="w-full bg-[#7B61FF] hover:bg-[#684DEC] text-white rounded-2xl py-5 text-lg font-black shadow-xl shadow-purple-200 transition-all active:scale-[0.98] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Preparando Gordito...' : 'Crear Cuenta 🚀'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs font-bold mt-10 uppercase tracking-widest">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#7B61FF] hover:underline transition-all">
            Inicia sesión ✨
          </Link>
        </p>
      </div>
    </div>
  )
}
