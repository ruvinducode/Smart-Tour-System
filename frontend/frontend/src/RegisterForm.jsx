import { useState } from 'react'

const DEFAULT_API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:5001'

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_API}${p}`
}

export default function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [reg, setReg] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    country: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(apiUrl('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reg),
      })

      const data = await response.json()

      if (response.ok) {
        onRegister()
      } else {
        setError(data.message || 'Registration failed')
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
    <article className="relative rounded-3xl border border-orange-200 bg-gradient-to-br from-white/90 to-white/80 shadow-[0_25px_100px_rgba(249,115,22,0.15)] backdrop-blur-lg sm:p-7">
      <div className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-3xl bg-gradient-to-r from-orange-400/10 to-sky-400/10 blur-xl opacity-50" />
      <div className="relative">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-['Space_Grotesk'] text-2xl font-semibold text-slate-900">Create Account</h2>
            <p className="text-slate-600">Join Smart Tour today</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-sky-500 p-3">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              required
              placeholder="Enter your full name"
              className={inputClass}
              value={reg.full_name}
              onChange={(e) => setReg({ ...reg, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
            <input
              type="email"
              required
              placeholder="Enter your email"
              className={inputClass}
              value={reg.email}
              onChange={(e) => setReg({ ...reg, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              placeholder="Create a password"
              className={inputClass}
              value={reg.password}
              onChange={(e) => setReg({ ...reg, password: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Phone Number</label>
            <input
              type="tel"
              required
              placeholder="Enter your phone number"
              className={inputClass}
              value={reg.phone}
              onChange={(e) => setReg({ ...reg, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Country</label>
            <input
              type="text"
              required
              placeholder="Enter your country"
              className={inputClass}
              value={reg.country}
              onChange={(e) => setReg({ ...reg, country: e.target.value })}
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
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-6 py-3 font-semibold text-white transition-all hover:from-orange-400 hover:to-sky-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-semibold text-orange-600 hover:text-orange-700 transition-colors"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </article>
  )
}
