import { useCallback, useEffect, useState } from 'react'
import Home from './Home.jsx'
import HomePage from './pages/HomePage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import DriverDashboardPage from './pages/DriverDashboardPage.jsx'
import useAuth from './hooks/useAuth.js'
import { calculateTourEstimate, getApiBaseUrl, loginDriver, loginUser } from './services/api.js'

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

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [driverLoginForm, setDriverLoginForm] = useState({ email: '', password: '' })
  const [vehicleType, setVehicleType] = useState('Car')
  const [locationCount, setLocationCount] = useState(3)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [estimate, setEstimate] = useState(null)

  const { loggedIn, userName, userRole, token, persistSession, logout } = useAuth()

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
    if (typeof window === 'undefined') return

    const normalizePublicView = (view) => {
      if (view === 'login') return 'login'
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

  const handleStartTour = useCallback(() => {
    setActivePage('plan-trip')
  }, [])

  const handleBackToHome = useCallback(() => {
    setActivePage('home')
  }, [])

  const handleOpenPlanTrip = useCallback(() => {
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
        if (authPreset.accountType === 'driver') {
          const driverData = await loginDriver(loginForm)
          const t = driverData.token
          const name = driverData.driver?.name || driverData.driver?.email || ''
          if (!t) throw new Error('No token in response')
          persistSession(t, name, 'driver')
          setInfo(driverData.message || 'Driver signed in.')
          return
        }

        if (authPreset.accountType === 'user') {
          const userData = await loginUser(loginForm)
          const t = userData.token
          const name = userData.user?.name || userData.user?.email || ''
          const role = userData.user?.role || 'user'
          if (!t) throw new Error('No token in response')
          persistSession(t, name, role)
          setInfo(userData.message || 'Signed in.')
          return
        }

        // Try driver first so approved driver accounts go straight to driver dashboard.
        try {
          const driverData = await loginDriver(loginForm)
          const t = driverData.token
          const name = driverData.driver?.name || driverData.driver?.email || ''
          if (!t) throw new Error('No token in response')
          persistSession(t, name, 'driver')
          setInfo(driverData.message || 'Driver signed in.')
          return
        } catch (driverError) {
          // If this email is a driver but not approved (or has another driver-only issue),
          // show that message directly and do not try user login.
          const msg = String(driverError?.message || '')
          const shouldStopOnDriverError =
            msg.includes('Driver not approved') ||
            msg.includes('Invalid password') ||
            msg.includes('Legacy driver password') ||
            msg.includes('Driver already exists')

          if (shouldStopOnDriverError) {
            throw driverError
          }

          // Only fallback to user login when driver account is not found.
          const userData = await loginUser(loginForm)
          const t = userData.token
          const name = userData.user?.name || userData.user?.email || ''
          const role = userData.user?.role || 'user'
          if (!t) throw new Error('No token in response')
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
        const driverData = await loginDriver(loginForm)
        const t = driverData.token
        const name = driverData.driver?.name || driverData.driver?.email || ''
        if (!t) throw new Error('No token in response')
        persistSession(t, name, 'driver')
        setInfo(driverData.message || 'Driver signed in.')
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
        const data = await calculateTourEstimate({ locations, vehicle_type: vehicleType })
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

  if (loggedIn) {
    const role = userRole || getRoleFromToken(token)

    if (role === 'admin') {
      return <AdminDashboardPage token={token} userName={userName} onLogout={handleLogout} />
    }

    if (role === 'driver') {
      return <DriverDashboardPage token={token} userName={userName} onLogout={handleLogout} />
    }

    if (activePage === 'home') {
      return (
        <HomePage
          onStartTour={handleStartTour}
          onGoToPlanTrip={handleOpenPlanTrip}
          userName={userName}
          token={token}
          onLogout={handleLogout}
        />
      )
    }

    return (
      <Home
        onLogout={handleLogout}
        userName={userName}
        onBackToHome={handleBackToHome}
        onGoToPlanTrip={handleOpenPlanTrip}
      />
    )
  }

  if (publicPage === 'landing') {
    return (
      <LandingPage
        onOpenLogin={() => {
          setAuthPreset({ accountType: '', mode: 'login' })
          setPublicView('login', true)
        }}
        onOpenUserLogin={() => {
          setAuthPreset({ accountType: 'user', mode: 'login' })
          setPublicView('login', true)
        }}
        onOpenUserRegister={() => {
          setAuthPreset({ accountType: 'user', mode: 'register' })
          setPublicView('login', true)
        }}
        onOpenDriverLogin={() => {
          setAuthPreset({ accountType: 'driver', mode: 'login' })
          setPublicView('login', true)
        }}
        onOpenDriverRegister={() => {
          setAuthPreset({ accountType: 'driver', mode: 'register' })
          setPublicView('login', true)
        }}
        onOpenAbout={() => setPublicView('about', true)}
      />
    )
  }

  if (publicPage === 'about') {
    return <AboutPage onBackHome={() => setPublicView('landing', true)} onOpenLogin={() => setPublicView('login', true)} />
  }

  return (
    <LoginPage
      error={error}
      info={info}
      loading={loading}
      loginForm={loginForm}
      setLoginForm={setLoginForm}
      showLoginPassword={showLoginPassword}
      setShowLoginPassword={setShowLoginPassword}
      onLogin={handleUnifiedLogin}
      onDriverLogin={handleDriverOnlyLogin}
      initialAccountType={authPreset.accountType || 'user'}
      initialMode={authPreset.mode || 'login'}
      vehicleType={vehicleType}
      setVehicleType={setVehicleType}
      locationCount={locationCount}
      setLocationCount={setLocationCount}
      onEstimate={handleEstimate}
      estimate={estimate}
      apiBaseUrl={API_BASE_URL}
    />
  )
}
