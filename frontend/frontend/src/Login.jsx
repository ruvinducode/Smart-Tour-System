import { VEHICLE_OPTIONS } from './vehicleOptions.js'

export default function Login({
  onBackToLanding,
  error,
  info,
  loading,
  loginForm,
  setLoginForm,
  showLoginPassword,
  setShowLoginPassword,
  onLogin,
  vehicleType,
  setVehicleType,
  locationCount,
  setLocationCount,
  onEstimate,
  estimate,
  apiBaseUrl,
  loginOnly = false,
}) {
  const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-100'

  const buttonPrimary =
    'inline-flex items-center justify-center rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition-all hover:bg-cyan-500 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-50'

  const buttonSecondary =
    'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-cyan-200 hover:text-cyan-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-50'

  const buttonGhost =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-cyan-700 transition-all hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-100'

  return (
    <section className={loginOnly ? 'mx-auto w-full max-w-2xl' : 'grid gap-6 lg:grid-cols-[1.05fr_0.95fr]'}>
      <article className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-[0_28px_70px_rgba(8,145,178,0.18)] sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-100 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-cyan-50 blur-3xl" />
        <div className="relative">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
                Secure sign in
              </p>
              <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-semibold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-600">Access your Smart Tour dashboard with enterprise-grade authentication.</p>
            </div>
            {onBackToLanding ? (
              <button type="button" onClick={onBackToLanding} className={buttonSecondary}>
                Back
              </button>
            ) : null}
          </div>

          <div className="mb-4 flex items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm font-semibold text-slate-800">
            <span>Sign in</span>
            <span className="text-xs font-medium text-cyan-700">Protected session</span>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 backdrop-blur-sm">
              {error}
            </div>
          ) : null}
          {info ? (
            <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 backdrop-blur-sm">
              {info}
            </div>
          ) : null}

          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={loginForm.email}
                onChange={(ev) => setLoginForm((s) => ({ ...s, email: ev.target.value }))}
                required
                className={inputClassName}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(ev) => setLoginForm((s) => ({ ...s, password: ev.target.value }))}
                  required
                  className={`${inputClassName} pr-20`}
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${buttonGhost}`}
                >
                  {showLoginPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button type="button" className={buttonGhost}>
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading} className={`w-full ${buttonPrimary}`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-xs text-slate-600 sm:grid-cols-3">
              <p className="font-medium">256-bit encryption</p>
              <p className="font-medium">Fast secure login</p>
              <p className="font-medium">Trusted travel system</p>
            </div>
          </form>
        </div>
      </article>

      {!loginOnly ? (
      <div className="space-y-6">
        <article className="relative rounded-3xl border border-cyan-200 bg-gradient-to-br from-white/90 to-white/80 shadow-[0_25px_100px_rgba(8,145,178,0.15)] backdrop-blur-lg">
          <div className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-3xl bg-gradient-to-r from-cyan-400/10 to-cyan-200/10 blur-xl opacity-50" />
          <div className="relative p-6">
            <h3 className="font-['Space_Grotesk'] text-xl font-semibold text-slate-900">Instant Tour Estimate</h3>
            <p className="mt-2 text-sm text-slate-600">
              Select vehicle type and stops to preview pricing and route response.
            </p>
            <form onSubmit={onEstimate} className="mt-4 space-y-4">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">Vehicle type</p>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_OPTIONS.map((v) => {
                    const on = vehicleType === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicleType(v.id)}
                        aria-pressed={on}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                          on
                            ? 'border-cyan-300 bg-cyan-100 text-cyan-700 shadow-lg shadow-cyan-500/20'
                            : 'border-cyan-100 bg-cyan-50 text-slate-600 hover:border-cyan-300 hover:bg-cyan-100/70'
                        }`}
                      >
                        {v.title}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label htmlFor="stops" className="mb-2 block text-sm font-medium text-slate-700">Number of stops</label>
                <input
                  id="stops"
                  type="number"
                  min={1}
                  max={20}
                  value={locationCount}
                  onChange={(ev) => setLocationCount(ev.target.value)}
                  className={inputClassName}
                  placeholder="Enter number of stops"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl border border-cyan-300/40 bg-cyan-600 py-3 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                    Calculating...
                  </span>
                ) : (
                  'Get estimate'
                )}
              </button>
            </form>
            {estimate ? (
              <div className="mt-4 max-h-48 overflow-auto rounded-xl border border-cyan-200 bg-cyan-50 p-4 backdrop-blur-sm">
                <pre className="text-xs text-slate-700 font-mono">
                  {JSON.stringify(estimate, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </article>

        <article className="relative rounded-3xl border border-cyan-200 bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-lg">
          <div className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-3xl bg-gradient-to-r from-cyan-400/10 to-cyan-200/10 blur-xl opacity-50" />
          <div className="relative p-6">
            <h3 className="mb-3 font-['Space_Grotesk'] text-lg font-semibold text-slate-900">System Architecture</h3>
            <p className="mb-4 text-sm leading-relaxed text-slate-600">Built with modern technologies for scalability, performance, and exceptional user experiences.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-600" />
                <span className="text-xs text-slate-600">Backend: Flask API with JWT authentication</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
                <span className="text-xs text-slate-600">Frontend: React with Vite and TailwindCSS</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                <span className="text-xs text-slate-600">Database: PostgreSQL with SQLAlchemy ORM</span>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3 backdrop-blur-sm">
              <p className="text-xs font-medium text-cyan-700">API Endpoint: {apiBaseUrl}</p>
            </div>
          </div>
        </article>
      </div>
      ) : null}
    </section>
  )
}
