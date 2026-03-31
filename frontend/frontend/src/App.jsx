import { useCallback, useState } from 'react'
import Home from './Home.jsx'
import HomePage from './HomePage.jsx'
import { VEHICLE_OPTIONS } from './vehicleOptions.js'

const DEFAULT_API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:5001'

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_API}${p}`
}

export default function App() {
  const [tab, setTab] = useState('login')
  const [token, setToken] = useState(() => localStorage.getItem('smart_tour_token') || '')
  const [userName, setUserName] = useState(() => localStorage.getItem('smart_tour_name') || '')
  const [showHomePage, setShowHomePage] = useState(true)
  const [selectedDestination, setSelectedDestination] = useState(null)

  const [reg, setReg] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    country: '',
  })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  const [vehicleType, setVehicleType] = useState('Car')
  const [locationCount, setLocationCount] = useState(3)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [estimate, setEstimate] = useState(null)

  const loggedIn = Boolean(token)

  const persistSession = useCallback((t, name) => {
    setToken(t)
    setUserName(name || '')
    if (t) localStorage.setItem('smart_tour_token', t)
    else localStorage.removeItem('smart_tour_token')
    if (name) localStorage.setItem('smart_tour_name', name)
    else localStorage.removeItem('smart_tour_name')
  }, [])

  const handleStartTour = useCallback((destination) => {
    setSelectedDestination(destination)
    setShowHomePage(false)
  }, [])

  const handleBackToHome = useCallback(() => {
    setShowHomePage(true)
    setSelectedDestination(null)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('smart_tour_token')
    localStorage.removeItem('smart_tour_name')
    setToken('')
    setUserName('')
    setShowHomePage(true)
    setSelectedDestination(null)
    setEstimate(null)
    setInfo('Signed out.')
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
      setInfo(data.message || 'Registered. You can sign in now.')
      setTab('login')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
      const t = data.token
      const name = data.user?.name || data.user?.email || ''
      if (!t) throw new Error('No token in response')
      persistSession(t, name)
      setInfo(data.message || 'Signed in.')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEstimate = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setEstimate(null)
    setLoading(true)
    try {
      const locations = Array.from({ length: Math.max(1, Number(locationCount) || 1) }, (_, i) => ({
        place_name: `Stop ${i + 1}`,
        latitude: 6.9 + i * 0.02,
        longitude: 79.9 + i * 0.02,
      }))
      const res = await fetch(apiUrl('/tour/calculate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations, vehicle_type: vehicleType }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
      setEstimate(data)
      setInfo('Estimate received.')
    } catch (err) {
      setError(err.message || 'Could not calculate tour')
    } finally {
      setLoading(false)
    }
  }

  if (loggedIn) {
    if (showHomePage) {
      return <HomePage onStartTour={handleStartTour} userName={userName} onLogout={handleLogout} />
    } else {
      return <Home onLogout={handleLogout} userName={userName} onBackToHome={handleBackToHome} />
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <header className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Smart Tour</h1>
        <p className="mt-1 text-sm text-slate-400">
          Plan routes and connect with drivers. API: {DEFAULT_API}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
          <h2 className="mb-4 text-base font-semibold text-white">Account</h2>
          <div className="mb-4 flex gap-2 rounded-lg border border-slate-700 p-1">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                tab === 'login'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                tab === 'register'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {error ? (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          {info ? (
            <div className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {info}
            </div>
          ) : null}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label htmlFor="email" className="mb-1 block text-xs text-slate-400">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(ev) => setLoginForm((s) => ({ ...s, email: ev.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-xs text-slate-400">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(ev) => setLoginForm((s) => ({ ...s, password: ev.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {loading ? '…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label htmlFor="full_name" className="mb-1 block text-xs text-slate-400">
                  Full name
                </label>
                <input
                  id="full_name"
                  value={reg.full_name}
                  onChange={(ev) => setReg((s) => ({ ...s, full_name: ev.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label htmlFor="reg_email" className="mb-1 block text-xs text-slate-400">
                  Email
                </label>
                <input
                  id="reg_email"
                  type="email"
                  value={reg.email}
                  onChange={(ev) => setReg((s) => ({ ...s, email: ev.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label htmlFor="reg_password" className="mb-1 block text-xs text-slate-400">
                  Password
                </label>
                <input
                  id="reg_password"
                  type="password"
                  value={reg.password}
                  onChange={(ev) => setReg((s) => ({ ...s, password: ev.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-xs text-slate-400">
                  Phone
                </label>
                <input
                  id="phone"
                  value={reg.phone}
                  onChange={(ev) => setReg((s) => ({ ...s, phone: ev.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label htmlFor="country" className="mb-1 block text-xs text-slate-400">
                  Country
                </label>
                <input
                  id="country"
                  value={reg.country}
                  onChange={(ev) => setReg((s) => ({ ...s, country: ev.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {loading ? '…' : 'Create account'}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
          <h2 className="mb-2 text-base font-semibold text-white">Tour estimate</h2>
          <p className="mb-4 text-xs text-slate-500">
            Uses <code className="text-slate-400">/tour/calculate</code>. Seed vehicles first (
            <code className="text-slate-400">python seed.py</code>).
          </p>
          <form onSubmit={handleEstimate} className="space-y-3">
            <div>
              <p className="mb-2 text-xs text-slate-400">Vehicle type</p>
              <div className="flex flex-wrap gap-1.5">
                {VEHICLE_OPTIONS.map((v) => {
                  const on = vehicleType === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleType(v.id)}
                      aria-pressed={on}
                      className={[
                        'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                        on
                          ? 'border-sky-500 bg-sky-500/15 text-sky-300 shadow-md shadow-sky-500/10'
                          : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-500 hover:shadow-sm',
                      ].join(' ')}
                    >
                      {v.title}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label htmlFor="stops" className="mb-1 block text-xs text-slate-400">
                Number of stops
              </label>
              <input
                id="stops"
                type="number"
                min={1}
                max={20}
                value={locationCount}
                onChange={(ev) => setLocationCount(ev.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? '…' : 'Get estimate'}
            </button>
          </form>
          {estimate ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              {JSON.stringify(estimate, null, 2)}
            </pre>
          ) : null}
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-slate-600">
        Sign in to open the map and pick tour stops.
      </p>
    </div>
  )
}
