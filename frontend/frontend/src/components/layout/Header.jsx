import appLogo from '../../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'
import { useState } from 'react'

export default function Header({ onNavigate, onAccessPlatform, onSearch }) {
  const [query, setQuery] = useState('')

  const submitSearch = (e) => {
    e.preventDefault()
    onSearch?.(query)
  }

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="group relative">
              <div className="absolute -inset-2 rounded-2xl bg-linear-to-r from-sky-500 via-sky-400 to-orange-400 opacity-30 blur-xl transition-opacity group-hover:opacity-50" />
              <img
                src={appLogo}
                alt="Smart Vehicle Tour logo"
                className="relative h-14 w-14 rounded-2xl border-2 border-white/20 object-cover shadow-2xl transition-transform group-hover:scale-110"
              />
            </div>
            <div>
              <h1 className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-white">Smart Vehicle Tour</h1>
              <p className="mt-1 text-sm font-medium text-sky-100">Sri Lanka Smart Travel Platform</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 lg:flex">
            <button
              type="button"
              onClick={() => onNavigate('sl-gallery')}
              className="font-medium text-white/80 transition-colors hover:text-white"
            >
              Destinations
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sl-features')}
              className="font-medium text-white/80 transition-colors hover:text-white"
            >
              Services
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sl-testimonials')}
              className="font-medium text-white/80 transition-colors hover:text-white"
            >
              Client Feedback
            </button>
            <button
              type="button"
              onClick={onAccessPlatform}
              className="rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white shadow-lg shadow-cyan-600/25 transition-all hover:scale-105 hover:bg-cyan-500"
            >
              Access Platform
            </button>
          </nav>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white lg:hidden">
            <button type="button" onClick={() => onNavigate('sl-gallery')} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 hover:bg-white/20">
              Destinations
            </button>
            <button type="button" onClick={() => onNavigate('sl-features')} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 hover:bg-white/20">
              Services
            </button>
            <button type="button" onClick={() => onNavigate('sl-testimonials')} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 hover:bg-white/20">
              Reviews
            </button>
          </div>

          <form onSubmit={submitSearch} className="w-full max-w-md">
            <div className="flex items-center gap-2 rounded-xl border border-white/25 bg-slate-900/40 px-3 py-2 backdrop-blur-md">
              <svg className="h-4 w-4 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: Kandy, gallery, services..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-300 outline-none"
              />
              <button type="submit" className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-bold text-white hover:bg-orange-400">
                Go
              </button>
            </div>
          </form>
        </div>
      </div>
    </header>
  )
}
