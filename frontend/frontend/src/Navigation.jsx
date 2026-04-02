import { useState } from 'react'
import appLogo from '../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

export default function Navigation({ showLandingOnly, setShowLandingOnly, token, userName, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('smart_tour_token')
    localStorage.removeItem('smart_tour_name')
    onLogout()
  }

  return (
    <header className="relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-400 to-orange-400 opacity-30 blur-xl transition-opacity group-hover:opacity-50" />
              <img
                src={appLogo}
                alt="Smart Vehicle Tour logo"
                className="relative h-14 w-14 rounded-2xl border-2 border-white/20 object-cover shadow-2xl group-hover:scale-110 transition-transform"
              />
            </div>
            <div>
              <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white tracking-tight">
                Smart Vehicle Tour
              </h1>
              <p className="mt-1 text-sm font-medium text-sky-100">
                {showLandingOnly ? 'Sri Lanka Smart Travel Platform' : 'Tour Management System'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {showLandingOnly ? (
              <>
                <a href="#destinations" className="font-medium text-white/80 transition-colors hover:text-white">
                  Destinations
                </a>
                <a href="#cultural" className="font-medium text-white/80 transition-colors hover:text-white">
                  Cultural Tours
                </a>
                <a href="#fleet" className="font-medium text-white/80 transition-colors hover:text-white">
                  Fleet Services
                </a>
                <button
                  type="button"
                  onClick={() => setShowLandingOnly(false)}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-orange-500 px-8 py-3 font-semibold text-white transition-all hover:from-sky-400 hover:to-orange-400 hover:scale-105"
                >
                  Get Started
                </button>
              </>
            ) : (
              <>
                <a href="#dashboard" className="font-medium text-white/80 transition-colors hover:text-white">
                  Dashboard
                </a>
                <a href="#tours" className="font-medium text-white/80 transition-colors hover:text-white">
                  Tours
                </a>
                <a href="#vehicles" className="font-medium text-white/80 transition-colors hover:text-white">
                  Vehicles
                </a>
                <div className="flex items-center gap-3">
                  <span className="text-white/80">Welcome, {userName}</span>
                  <button
                    type="button"
                    onClick={() => setShowLandingOnly(true)}
                    className="rounded-xl border border-white/30 bg-white/10 px-6 py-2 font-medium text-white transition-all hover:bg-white/20"
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl bg-red-500/20 border border-red-300/30 px-6 py-2 font-medium text-red-200 transition-all hover:bg-red-500/30"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden rounded-xl bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mt-6 lg:hidden">
            <nav className="flex flex-col gap-4 rounded-2xl bg-white/10 backdrop-blur-sm p-4">
              {showLandingOnly ? (
                <>
                  <a href="#destinations" className="font-medium text-white/80 transition-colors hover:text-white">
                    Destinations
                  </a>
                  <a href="#cultural" className="font-medium text-white/80 transition-colors hover:text-white">
                    Cultural Tours
                  </a>
                  <a href="#fleet" className="font-medium text-white/80 transition-colors hover:text-white">
                    Fleet Services
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLandingOnly(false)
                      setMobileMenuOpen(false)
                    }}
                    className="rounded-xl bg-gradient-to-r from-sky-500 to-orange-500 px-6 py-3 font-semibold text-white transition-all hover:from-sky-400 hover:to-orange-400"
                  >
                    Get Started
                  </button>
                </>
              ) : (
                <>
                  <a href="#dashboard" className="font-medium text-white/80 transition-colors hover:text-white">
                    Dashboard
                  </a>
                  <a href="#tours" className="font-medium text-white/80 transition-colors hover:text-white">
                    Tours
                  </a>
                  <a href="#vehicles" className="font-medium text-white/80 transition-colors hover:text-white">
                    Vehicles
                  </a>
                  <div className="flex flex-col gap-3 pt-3 border-t border-white/20">
                    <span className="text-white/80 text-center">Welcome, {userName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLandingOnly(true)
                        setMobileMenuOpen(false)
                      }}
                      className="rounded-xl border border-white/30 bg-white/10 px-6 py-2 font-medium text-white transition-all hover:bg-white/20"
                    >
                      Home
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout()
                        setMobileMenuOpen(false)
                      }}
                      className="rounded-xl bg-red-500/20 border border-red-300/30 px-6 py-2 font-medium text-red-200 transition-all hover:bg-red-500/30"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
