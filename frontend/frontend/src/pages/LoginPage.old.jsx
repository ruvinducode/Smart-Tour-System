import { useEffect, useMemo, useState } from 'react'
import SriLankaMapTourAnimation from '../components/SriLankaMapTourAnimation.jsx'
import { registerDriver, registerUser } from '../services/api.js'

export default function LoginPage({
  error,
  info,
  loading,
  loginForm,
  setLoginForm,
  driverLoginForm,
  setDriverLoginForm,
  showLoginPassword,
  setShowLoginPassword,
  onLogin,
  onDriverLogin,
  initialAccountType = 'user',
  initialMode = 'login',
}) {
  const [accountType, setAccountType] = useState(initialAccountType)
  const [mode, setMode] = useState(initialMode)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerInfo, setRegisterInfo] = useState('')
  const [reg, setReg] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    country: '',
  })
  const [driverReg, setDriverReg] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    license_number: '',
    vehicle_number: '',
    vehicle_type: '',
    capacity: '',
  })

  const inputClassName =
    'w-full rounded-2xl border border-sky-300 bg-linear-to-r from-sky-50 to-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100'

  const panelTitle = useMemo(() => {
    if (accountType === 'admin') return 'Admin Portal'
    if (accountType === 'driver' && mode === 'register') return 'Create driver account'
    if (accountType === 'driver') return 'Driver portal'
    if (mode === 'register') return 'Create your account'
    return 'Welcome back'
  }, [accountType, mode])

  const panelSubtitle = useMemo(() => {
    if (accountType === 'admin') return 'Sign in with admin credentials to manage drivers and the system.'
    if (accountType === 'driver' && mode === 'register') return 'Register as a driver and wait for admin approval.'
    if (accountType === 'driver') return 'Sign in to manage your driver profile and trips.'
    if (mode === 'register') return 'Start your Sri Lanka travel planning journey.'
    return 'Sign in and manage your Sri Lanka tours in one place.'
  }, [accountType, mode])

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegisterError('')
    setRegisterInfo('')
    setRegisterLoading(true)

    try {
      const data = await registerUser(reg)
      setRegisterInfo(data.message || 'Registration complete. Please sign in.')
      setMode('login')
      setLoginForm((prev) => ({ ...prev, email: reg.email }))
    } catch (err) {
      setRegisterError(err.message || 'Registration failed')
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleDriverRegister = async (e) => {
    e.preventDefault()
    setRegisterError('')
    setRegisterInfo('')
    setRegisterLoading(true)

    try {
      const payload = {
        ...driverReg,
        capacity: driverReg.capacity ? Number(driverReg.capacity) : null,
      }
      const data = await registerDriver(payload)
      setRegisterInfo(data.message || 'Driver registration complete. Await admin approval.')
      setMode('login')
      setDriverLoginForm((prev) => ({ ...prev, email: driverReg.email }))
    } catch (err) {
      setRegisterError(err.message || 'Driver registration failed')
    } finally {
      setRegisterLoading(false)
    }
  }

  useEffect(() => {
    setAccountType(initialAccountType)
    setMode(initialMode)
    setRegisterError('')
    setRegisterInfo('')
  }, [initialAccountType, initialMode])

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-100 via-sky-100/60 to-sky-50 px-4 py-8 sm:px-6 lg:py-14">
      <div className="mx-auto w-full max-w-6xl rounded-4xl border border-sky-200 bg-[#f8f7f2] p-3 shadow-[0_35px_80px_rgba(30,64,175,0.2)] sm:p-5">
        <div className="grid min-h-170 gap-3 rounded-3xl bg-linear-to-br from-white/90 to-sky-50/60 p-3 lg:grid-cols-[0.95fr_1.15fr] lg:gap-4 lg:p-4">
          <section className="relative rounded-3xl bg-linear-to-b from-orange-50 via-sky-50 to-orange-100/60 px-6 py-6 sm:px-10 sm:py-8">
            <button
              type="button"
              className="inline-flex rounded-full border border-sky-300 bg-sky-100 px-5 py-2 text-sm font-medium text-sky-700"
            >
              Smart Tour Sri Lanka
            </button>

            <div className="mt-4 inline-flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-sky-200">
              <button
                type="button"
                onClick={() => {
                  setAccountType('user')
                  setMode('login')
                  setRegisterError('')
                  setRegisterInfo('')
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  accountType === 'user' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType('driver')
                  setMode('login')
                  setRegisterError('')
                  setRegisterInfo('')
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  accountType === 'driver' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                Driver
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType('admin')
                  setMode('login')
                  setRegisterError('')
                  setRegisterInfo('')
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  accountType === 'admin' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                Admin
              </button>
            </div>

            {accountType !== 'admin' && (
              <div className="mt-8 inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-sky-200">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    mode === 'login' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    mode === 'register' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
                  }`}
                >
                  Register
                </button>
              </div>
            )}

            <div className="mt-8 max-w-sm">
              <h2 className="font-['Space_Grotesk'] text-4xl font-semibold tracking-tight text-slate-800">{panelTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">{panelSubtitle}</p>

              {mode === 'login' ? (
                <form onSubmit={accountType === 'driver' ? onDriverLogin : onLogin} className="mt-8 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={accountType === 'driver' ? driverLoginForm.email : loginForm.email}
                      onChange={(ev) => {
                        if (accountType === 'driver') {
                          setDriverLoginForm((prev) => ({ ...prev, email: ev.target.value }))
                          return
                        }
                        setLoginForm((prev) => ({ ...prev, email: ev.target.value }))
                      }}
                      className={inputClassName}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={accountType === 'driver' ? driverLoginForm.password : loginForm.password}
                        onChange={(ev) => {
                          if (accountType === 'driver') {
                            setDriverLoginForm((prev) => ({ ...prev, password: ev.target.value }))
                            return
                          }
                          setLoginForm((prev) => ({ ...prev, password: ev.target.value }))
                        }}
                        className={`${inputClassName} pr-20`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        {showLoginPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
                  ) : null}

                  {info || registerInfo ? (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {registerInfo || info}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Signing in...' : accountType === 'driver' ? 'Driver sign in' : accountType === 'admin' ? 'Admin sign in' : 'Submit'}
                  </button>
                </form>
              ) : (
                <>
                  {accountType === 'driver' ? (
                    <form onSubmit={handleDriverRegister} className="mt-8 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Full name</label>
                        <input
                          type="text"
                          required
                          value={driverReg.full_name}
                          onChange={(ev) => setDriverReg((prev) => ({ ...prev, full_name: ev.target.value }))}
                          className={inputClassName}
                          placeholder="Driver full name"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
                        <input
                          type="email"
                          required
                          value={driverReg.email}
                          onChange={(ev) => setDriverReg((prev) => ({ ...prev, email: ev.target.value }))}
                          className={inputClassName}
                          placeholder="driver@example.com"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
                        <div className="relative">
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            required
                            value={driverReg.password}
                            onChange={(ev) => setDriverReg((prev) => ({ ...prev, password: ev.target.value }))}
                            className={`${inputClassName} pr-20`}
                            placeholder="Create your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            {showRegisterPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-500">Phone</label>
                          <input
                            type="tel"
                            required
                            value={driverReg.phone}
                            onChange={(ev) => setDriverReg((prev) => ({ ...prev, phone: ev.target.value }))}
                            className={inputClassName}
                            placeholder="+94..."
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-500">License number</label>
                          <input
                            type="text"
                            value={driverReg.license_number}
                            onChange={(ev) => setDriverReg((prev) => ({ ...prev, license_number: ev.target.value }))}
                            className={inputClassName}
                            placeholder="License number"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-500">Vehicle number</label>
                          <input
                            type="text"
                            value={driverReg.vehicle_number}
                            onChange={(ev) => setDriverReg((prev) => ({ ...prev, vehicle_number: ev.target.value }))}
                            className={inputClassName}
                            placeholder="WP-XXXX"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-500">Vehicle type</label>
                          <input
                            type="text"
                            value={driverReg.vehicle_type}
                            onChange={(ev) => setDriverReg((prev) => ({ ...prev, vehicle_type: ev.target.value }))}
                            className={inputClassName}
                            placeholder="Car, Van, Bus"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Capacity</label>
                        <input
                          type="number"
                          min={1}
                          value={driverReg.capacity}
                          onChange={(ev) => setDriverReg((prev) => ({ ...prev, capacity: ev.target.value }))}
                          className={inputClassName}
                          placeholder="Number of passengers"
                        />
                      </div>

                      {registerError ? (
                        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{registerError}</div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={registerLoading}
                        className="mt-2 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {registerLoading ? 'Creating driver account...' : 'Create driver account'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="mt-8 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Full name</label>
                        <input
                          type="text"
                          required
                          value={reg.full_name}
                          onChange={(ev) => setReg((prev) => ({ ...prev, full_name: ev.target.value }))}
                          className={inputClassName}
                          placeholder="Your full name"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
                        <input
                          type="email"
                          required
                          value={reg.email}
                          onChange={(ev) => setReg((prev) => ({ ...prev, email: ev.target.value }))}
                          className={inputClassName}
                          placeholder="you@example.com"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
                        <div className="relative">
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            required
                            value={reg.password}
                            onChange={(ev) => setReg((prev) => ({ ...prev, password: ev.target.value }))}
                            className={`${inputClassName} pr-20`}
                            placeholder="Create your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            {showRegisterPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-500">Phone</label>
                          <input
                            type="tel"
                            required
                            value={reg.phone}
                            onChange={(ev) => setReg((prev) => ({ ...prev, phone: ev.target.value }))}
                            className={inputClassName}
                            placeholder="+94..."
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-500">Country</label>
                          <input
                            type="text"
                            required
                            value={reg.country}
                            onChange={(ev) => setReg((prev) => ({ ...prev, country: ev.target.value }))}
                            className={inputClassName}
                            placeholder="Country"
                          />
                        </div>
                      </div>

                      {registerError ? (
                        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{registerError}</div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={registerLoading}
                        className="mt-2 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {registerLoading ? 'Creating account...' : 'Create account'}
                      </button>
                    </form>
                  )}
                </>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="rounded-full border border-sky-300 bg-sky-100 px-4 py-2 text-xs font-medium text-sky-800 transition hover:bg-sky-50"
                >
                  Apple
                </button>
                <button
                  type="button"
                  className="rounded-full border border-orange-300 bg-orange-100 px-4 py-2 text-xs font-medium text-orange-800 transition hover:bg-orange-50"
                >
                  Google
                </button>
              </div>

              <div className="mt-10 flex items-center justify-between text-xs text-slate-500">
                <p>
                  Need help? <span className="font-semibold text-slate-700">Support center</span>
                </p>
                <button type="button" className="underline decoration-slate-400 underline-offset-4">
                  Terms & Conditions
                </button>
              </div>
            </div>
          </section>

          <section className="relative flex min-h-80 flex-col justify-stretch lg:min-h-0">
            <SriLankaMapTourAnimation />
          </section>
        </div>
      </div>
    </div>
  )
}
