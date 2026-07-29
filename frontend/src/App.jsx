import React, { useCallback, useEffect, useMemo, useState, Suspense, lazy } from 'react'
import useAuth from './hooks/useAuth.js'
import { calculateTourEstimate, getApiBaseUrl, loginDriver, loginUser } from './services/api.js'
import { initGA, logPageView } from './utils/analytics.js'

// Matches each section's real background so the Suspense loading screen
// blends in with whatever page the user was just on, instead of a fixed color.
const PAGE_THEME = {
  home:      { bg: '#fffbeb', glow: 'rgba(217, 119, 6, 0.16)' },
  auth:      { bg: '#f0fdf4', glow: 'rgba(16, 185, 129, 0.16)' },
  dashboard: { bg: '#f8fafc', glow: 'rgba(51, 65, 85, 0.12)' },
}

// Wraps lazy() so that if a page chunk 404s (e.g. the user had the app open
// across a new deploy, so old chunk filenames no longer exist on the server),
// we reload once to fetch the current build instead of leaving a blank screen.
function lazyWithReload(factory) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      const key = 'chunk-reload-attempted'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        return new Promise(() => {}) // reloading; never resolve
      }
      sessionStorage.removeItem(key)
      throw err
    }
  })
}

const Home = lazyWithReload(() => import('./pages/Home.jsx'))
const HomePage = lazyWithReload(() => import('./pages/HomePage.jsx'))
const AboutPage = lazyWithReload(() => import('./pages/AboutPage.jsx'))
const LandingPage = lazyWithReload(() => import('./pages/LandingPage.jsx'))
const LoginPage = lazyWithReload(() => import('./pages/LoginPage.jsx'))
const AdminDashboardPage = lazyWithReload(() => import('./pages/AdminDashboardPage.jsx'))
const DriverDashboardPage = lazyWithReload(() => import('./pages/DriverDashboardPage.jsx'))
const FindingDriverPage = lazyWithReload(() => import('./pages/FindingDriverPage.jsx'))
const UserDashboardPage = lazyWithReload(() => import('./pages/UserDashboardPage.jsx'))

const API_BASE_URL = getApiBaseUrl()

function getRoleFromToken(token) {
  if (!token) return ''
  try {
    const payload = token.split('.')[1]
    if (!payload) return ''
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized))
    return decoded.role || ''
  } catch {
    return ''
  }
}

export default function App() {
  const [activePage, setActivePage] = useState('home')
  const [publicPage, setPublicPage] = useState('landing')
  const [authPreset, setAuthPreset] = useState({ accountType: 'user', mode: 'login' })
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [findingDriverData, setFindingDriverData] = useState(null) // { startLocation, bookingDetails }

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [driverLoginForm, setDriverLoginForm] = useState({ email: '', password: '' })
  const [vehicleType, setVehicleType] = useState('Car')
  const [locationCount, setLocationCount] = useState(3)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [selectedDestForTrip, setSelectedDestForTrip] = useState(null) // destination pre-fill for plan-trip page

  const { loggedIn, userName, userRole, token, persistSession, logout } = useAuth()

  const currentThemeKey = useMemo(() => {
    if (loggedIn) {
      const role = userRole || getRoleFromToken(token)
      if (role === 'admin' || role === 'driver') return 'dashboard'
      if (role === 'user' && activePage === 'dashboard' && !findingDriverData) return 'dashboard'
      return 'home'
    }
    if (publicPage === 'user-auth' || publicPage === 'driver-auth') return 'auth'
    return 'home'
  }, [loggedIn, userRole, token, activePage, findingDriverData, publicPage])

  useEffect(() => {
    const theme = PAGE_THEME[currentThemeKey] || PAGE_THEME.home
    document.documentElement.style.setProperty('--app-bg', theme.bg)
    document.documentElement.style.setProperty('--app-bg-glow', theme.glow)
    // This app swaps pages by re-rendering rather than real navigation, so the
    // browser keeps whatever scroll position the previous page was at (e.g.
    // landing on the Home page still scrolled down from the login screen).
    window.scrollTo(0, 0)
  }, [currentThemeKey])

  const setPublicView = useCallback((view, push = true) => {
    setPublicPage(view)
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    if (view === 'landing') url.searchParams.delete('view')
    else url.searchParams.set('view', view)

    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    const state = { appView: view }

    if (push) window.history.pushState(state, '', nextUrl)
    else window.history.replaceState(state, '', nextUrl)
  }, [])

  useEffect(() => {
    // Initialize Google Analytics on initial mount
    initGA();
    
    if (typeof window === 'undefined') return

    const normalizePublicView = (view) => {
      if (view === 'user-auth') return 'user-auth'
      if (view === 'driver-auth') return 'driver-auth'
      if (view === 'login') return 'user-auth' // Fallback
      if (view === 'about') return 'about'
      return 'landing'
    }

    const getViewFromLocation = () => {
      const url = new URL(window.location.href)
      return normalizePublicView(url.searchParams.get('view'))
    }

    const initialView = getViewFromLocation()
    setPublicPage(initialView)
    window.history.replaceState({ appView: initialView }, '', window.location.href)

    const onPopState = (event) => {
      if (loggedIn) return
      const view = normalizePublicView(event.state?.appView || getViewFromLocation())
      setPublicPage(view)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [loggedIn])

  // Track page views on route/state changes
  useEffect(() => {
    logPageView();
  }, [activePage, publicPage, loggedIn])

  // Navigation Handlers
  const handleStartTour = useCallback(() => setActivePage('plan-trip'), [])
  const handleBackToHome = useCallback(() => setActivePage('home'), [])
  const handleOpenPlanTrip = useCallback(() => setActivePage('plan-trip'), [])
  const handleViewDashboard = useCallback(() => setActivePage('dashboard'), [])
  const handlePlanTripWithDest = useCallback((dest) => {
    setSelectedDestForTrip(dest)
    setActivePage('plan-trip')
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    setActivePage('home')
    setPublicView('landing', false)
    setEstimate(null)
    setInfo('Signed out.')
  }, [logout, setPublicView])

  const handleUnifiedLogin = useCallback(
    async (e) => {
      e.preventDefault()
      setError('')
      setInfo('')
      setLoading(true)
      try {
        if (authPreset.accountType === 'user') {
          const userData = await loginUser(loginForm)
          const t = userData.token
          const name = userData.user?.name || userData.user?.email || ''
          const role = userData.user?.role || 'user'
          
          if (!t) throw new Error('No token in response')
          
          // Role check: Only allow 'user' or 'admin'
          if (role === 'driver') {
            throw new Error('Drivers must use the Partner Portal to sign in.')
          }
          
          persistSession(t, name, role)
          setInfo(userData.message || 'Signed in.')
          return
        }
      } catch (err) {
        setError(err.message || 'Login failed')
      } finally {
        setLoading(false)
      }
    },
    [authPreset.accountType, loginForm, persistSession],
  )

  const handleDriverOnlyLogin = useCallback(
    async (e) => {
      e.preventDefault()
      setError('')
      setInfo('')
      setLoading(true)
      try {
        // 1. Try Driver Login
        try {
          const driverData = await loginDriver(loginForm)
          const t = driverData.token
          const name = driverData.driver?.name || driverData.driver?.email || ''
          if (!t) throw new Error('No token in response')
          persistSession(t, name, 'driver')
          setInfo(driverData.message || 'Driver signed in.')
          return
        } catch (driverError) {
          // If it's a "not approved" or "wrong password" error, don't fallback to user
          const msg = String(driverError?.message || '')
          if (msg.includes('not approved') || msg.includes('Invalid password')) {
            throw driverError
          }
          
          // 2. Fallback to User Login ONLY for Admins
          const userData = await loginUser(loginForm)
          const t = userData.token
          const name = userData.user?.name || userData.user?.email || ''
          const role = userData.user?.role || 'user'
          
          if (role !== 'admin') {
            throw new Error('This portal is for Drivers only. Please use the Traveler login.')
          }
          
          persistSession(t, name, role)
          setInfo('Admin signed in via Partner Portal.')
        }
      } catch (err) {
        setError(err.message || 'Driver login failed')
      } finally {
        setLoading(false)
      }
    },
    [loginForm, persistSession],
  )

  const handleEstimate = useCallback(
    async (e) => {
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
        const today = new Date().toISOString().split('T')[0]
        const data = await calculateTourEstimate({
          locations,
          vehicle_type: vehicleType,
          start_date: today,
          end_date: today,
        })
        setEstimate(data)
        setInfo('Estimate received.')
      } catch (err) {
        setError(err.message || 'Could not calculate tour')
      } finally {
        setLoading(false)
      }
    },
    [locationCount, vehicleType],
  )

  // --- MAIN RENDER LOGIC ---
  if (loggedIn) {
    const role = userRole || getRoleFromToken(token)

    if (role === 'admin') {
      return <AdminDashboardPage token={token} userName={userName} onLogout={handleLogout} />
    }

    if (role === 'driver') {
      return <DriverDashboardPage token={token} userName={userName} onLogout={handleLogout} />
    }

    // Finding-driver screen (Uber-style)
    if (findingDriverData) {
      return (
        <FindingDriverPage
          startLocation={findingDriverData.startLocation}
          bookingDetails={findingDriverData.bookingDetails}
          onCancel={() => setFindingDriverData(null)}
          onDriverFound={() => {
            setFindingDriverData(null)
            setActivePage('dashboard') // Redirects to the new dashboard once a driver is found!
          }}
        />
      )
    }

    // User Routing block
    if (role === 'user') {
      if (activePage === 'dashboard') {
        return (
          <UserDashboardPage
            token={token}
            userName={userName}
            onLogout={handleLogout}
            onGoToPlanner={handleOpenPlanTrip}
          />
        )
      }

      if (activePage === 'home') {
        return (
          <HomePage
            onStartTour={handleStartTour}
            onGoToPlanTrip={handleOpenPlanTrip}
            onPlanTripWithDest={handlePlanTripWithDest}
            onViewDashboard={handleViewDashboard}
            userName={userName}
            token={token}
            onLogout={handleLogout}
            onOpenAbout={() => setActivePage('about')}
          />
        )
      }

      if (activePage === 'about') {
        return <AboutPage onBackHome={() => setActivePage('home')} onOpenLogin={() => setActivePage('home')} />
      }

      // Default to "plan-trip" view
      return (
        <Home
          onLogout={handleLogout}
          userName={userName}
          onBackToHome={handleBackToHome}
          onGoToPlanTrip={handleOpenPlanTrip}
          onBookingConfirmed={(data) => setFindingDriverData(data)}
          initialDestination={selectedDestForTrip}
        />
      )
    }
  }

  // --- PUBLIC VIEWS ---
  if (publicPage === 'landing') {
    return (
      <LandingPage
        onOpenUserLogin={() => {
          setAuthPreset({ accountType: 'user', mode: 'login' })
          setPublicView('user-auth', true)
        }}
        onOpenUserRegister={() => {
          setAuthPreset({ accountType: 'user', mode: 'register' })
          setPublicView('user-auth', true)
        }}
        onOpenDriverLogin={() => {
          setAuthPreset({ accountType: 'driver', mode: 'login' })
          setPublicView('driver-auth', true)
        }}
        onOpenDriverRegister={() => {
          setAuthPreset({ accountType: 'driver', mode: 'register' })
          setPublicView('driver-auth', true)
        }}
        onOpenAbout={() => setPublicView('about', true)}
      />
    )
  }

  if (publicPage === 'about') {
    return <AboutPage onBackHome={() => setPublicView('landing', true)} onOpenLogin={() => setPublicView('login', true)} />
  }

  if (publicPage === 'user-auth') {
    return (
      <LoginPage
        error={error} info={info} loading={loading}
        loginForm={loginForm} setLoginForm={setLoginForm}
        onLogin={handleUnifiedLogin}
        roleLock="user"
        initialMode={authPreset.mode || 'login'}
      />
    )
  }

  if (publicPage === 'driver-auth') {
    return (
      <LoginPage
        error={error} info={info} loading={loading}
        loginForm={loginForm} setLoginForm={setLoginForm}
        onLogin={handleUnifiedLogin}
        onDriverLogin={handleDriverOnlyLogin}
        roleLock="driver"
        initialMode={authPreset.mode || 'login'}
      />
    )
  }

  return null // Should not reach here
}