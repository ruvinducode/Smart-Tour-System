import { useState } from 'react'

const DEFAULT_API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:5001'

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_API}${p}`
}

export default function LoginForm({ onLogin, onSwitchToRegister }) {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('smart_tour_token', data.access_token)
        localStorage.setItem('smart_tour_name', data.user.name)
        onLogin(data.access_token, data.user.name)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 
    'w-full rounded-xl border border-sky-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 backdrop-blur-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all'

  return (
    <article className="relative rounded-3xl border border-sky-200 bg-gradient-to-br from-white/90 to-white/80 shadow-[0_25px_100px_rgba(56,189,248,0.15)] backdrop-blur-lg sm:p-7">
      <div className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-3xl bg-gradient-to-r from-sky-400/10 to-orange-400/10 blur-xl opacity-50" />
      <div className="relative">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-['Space_Grotesk'] text-2xl font-semibold text-slate-900">Welcome Back</h2>
            <p className="text-slate-600">Sign in to your Smart Tour account</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-orange-500 p-3">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
            <input
              type="email"
              required
              placeholder="Enter your email"
              className={inputClass}
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              className={inputClass}
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-orange-500 px-6 py-3 font-semibold text-white transition-all hover:from-sky-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-semibold text-sky-600 hover:text-sky-700 transition-colors"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </article>
  )
}
