import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  approveDriverTourRequest,
  getDriverTourRequests,
  getDriverIncomingTourRequests,
  sendDriverNegotiatedPrice,
  getDriverProfile,
  updateDriverProfile,
  getDriverNotifications,
  driverUploadUrl,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  getDriverFeedbacks,
} from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'
import IncomingTourRequestModal from '../components/driver/IncomingTourRequestModal.jsx'
import ConfirmationModal from '../components/ConfirmationModal.jsx'
import DashboardChart from '../components/DashboardChart.jsx'
import DashboardPieChart from '../components/DashboardPieChart.jsx'
import DashboardStatCard from '../components/DashboardStatCard.jsx'
import Footer from '../components/Footer.jsx'
import LiveHireDriver from './LiveHireDriver.jsx'
import DriverTourListSection from '../components/driver/DriverTourListSection.jsx'
import DriverPaymentsSection from '../components/driver/DriverPaymentsSection.jsx'
import DriverProfileSection from '../components/driver/DriverProfileSection.jsx'
import {
  buildLast7DaysChart,
  buildStatusDistribution,
  computeDriverAnalytics,
  formatCurrency,
} from '../utils/dashboardAnalytics.js'
import appLogo from '../../images/logo.jpeg'
import { DriverLanguageProvider, useDriverLang } from '../i18n/DriverLanguageContext.jsx'

const NAV_ITEMS = [
  { id: 'all',         labelKey: 'nav.dashboard',   icon: 'bi bi-grid-fill' },
  { id: 'upcoming',    labelKey: 'nav.upcoming',    icon: 'bi bi-calendar-event-fill', countKey: 'upcoming' },
  { id: 'approved',    labelKey: 'nav.approved',    icon: 'bi bi-check-circle-fill', countKey: 'approved' },
  { id: 'price_sent',  labelKey: 'nav.negotiating', icon: 'bi bi-arrow-left-right', countKey: 'negotiating' },
  { id: 'payments',    labelKey: 'nav.payments',    icon: 'bi bi-wallet2' },
  { id: 'feedbacks',   labelKey: 'nav.feedbacks',   icon: 'bi bi-star-fill' },
  { id: 'profile',     labelKey: 'nav.profile',     icon: 'bi bi-person-circle' },
]

const TAB_TITLE_KEYS = {
  all: 'tabTitle.all',
  upcoming: 'tabTitle.upcoming',
  approved: 'tabTitle.approved',
  price_sent: 'tabTitle.price_sent',
  payments: 'tabTitle.payments',
  feedbacks: 'tabTitle.feedbacks',
  profile: 'tabTitle.profile',
}

export default function DriverDashboardPage(props) {
  return (
    <DriverLanguageProvider>
      <DriverDashboardPageInner {...props} />
    </DriverLanguageProvider>
  )
}

function DriverDashboardPageInner({ token, userName, onLogout }) {
  const { t, lang, setLang } = useDriverLang()
  const [tourRequests, setTourRequests] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [info, setInfo]                 = useState('')
  const [priceInputs, setPriceInputs]   = useState({})
  const [activeTab, setActiveTab]       = useState('all')
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  
  // Profile State
  const [profileData, setProfileData] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  // A dedicated fixed-position popup for the profile save result, separate
  // from the inline `info`/`error` banner above the tab content — that banner
  // can scroll out of view on a long form, which is exactly the "success
  // popup doesn't show" complaint this was meant to fix.
  const [profileToast, setProfileToast] = useState(null)

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning',
    isLoading: false
  })

  const [activeRideTourId, setActiveRideTourId] = useState(null)
  // Tours already auto-launched into the live-tracking screen once they
  // became confirmed, so the driver isn't forced back in if they navigate
  // away — see the effect below that watches for the confirm transition.
  const launchedRideTourIdsRef = useRef(new Set())
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackSummary, setFeedbackSummary] = useState(null)

  // New-request interruption popup — separate from the "Upcoming" tab list;
  // see getDriverIncomingTourRequests for the eligibility rules (vehicle
  // match, driver not busy or nearly done with their current trip).
  const [incomingRequests, setIncomingRequests] = useState([])
  const [activeIncomingTour, setActiveIncomingTour] = useState(null)
  const [incomingActionBusy, setIncomingActionBusy] = useState(false)
  // Session-only "not now" list — a dismissed request can still be acted on
  // later from the Upcoming tab, it just won't re-interrupt this session.
  const [dismissedIncomingIds, setDismissedIncomingIds] = useState(() => new Set())
  // Tours whose popup is showing the "offer sent, pending" confirmation —
  // negotiating flips the tour's status, which drops it out of the next
  // incoming-requests poll; without this, the auto-clear effect below would
  // treat that as "someone else claimed it" and close the popup before the
  // driver ever sees the confirmation.
  const [awaitingOfferConfirmationIds, setAwaitingOfferConfirmationIds] = useState(() => new Set())

  const handleMarkNotifRead = async (id) => {
    try {
      await markNotificationRead(id, token)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n))
    } catch { /* silent */ }
  }

  const handleMarkAllNotifRead = async () => {
    try {
      await markAllNotificationsRead(token)
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })))
    } catch { /* silent */ }
  }

  const handleDismissNotif = async (id) => {
    try {
      await deleteNotification(id, token)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch { /* silent */ }
  }

  const handleClearAllNotifs = async () => {
    try {
      await clearAllNotifications(token)
      setNotifications([])
    } catch { /* silent */ }
  }

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getDriverProfile(token)
      setProfileData(data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
  }, [token])

  const loadTourRequests = useCallback(async (silent = false) => {
    setError('')
    if (!silent) setLoading(true)
    try {
      const [tourData, notifData, feedbackData, incomingData] = await Promise.all([
        getDriverTourRequests(token),
        getDriverNotifications(token),
        getDriverFeedbacks(token).catch(() => null),
        getDriverIncomingTourRequests(token).catch(() => []),
      ])
      setTourRequests(Array.isArray(tourData) ? tourData : [])
      setNotifications(Array.isArray(notifData) ? notifData : [])
      if (feedbackData) {
        setFeedbacks(Array.isArray(feedbackData.feedbacks) ? feedbackData.feedbacks : [])
        setFeedbackSummary(feedbackData.summary || null)
      }
      setIncomingRequests(Array.isArray(incomingData) ? incomingData : [])
    } catch (err) {
      if (!silent) setError(err.message || t('toast.couldNotLoadDashboard'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token])

  // Show one incoming request at a time. If the one currently shown drops
  // out of the eligible list (someone else claimed it, or the driver became
  // busy), close it automatically rather than leaving a stale popup up.
  useEffect(() => {
    setActiveIncomingTour((prevActive) => {
      if (prevActive && !incomingRequests.some((t) => t.id === prevActive.id)) {
        if (awaitingOfferConfirmationIds.has(prevActive.id)) return prevActive
        return null
      }
      if (prevActive) return prevActive
      return incomingRequests.find((t) => !dismissedIncomingIds.has(t.id)) || null
    })
  }, [incomingRequests, dismissedIncomingIds, awaitingOfferConfirmationIds])

  const handleIncomingAccept = async (tourId) => {
    setIncomingActionBusy(true)
    setError(''); setInfo('')
    try {
      const data = await approveDriverTourRequest(tourId, token)
      // Accepting only sends an offer at the listed price now — another
      // driver may also respond, so the traveler still has to confirm it.
      // Jumping straight into the live-tracking screen here (as this used
      // to) would drop the driver into an unconfirmed tour; the screen only
      // makes sense once loadTourRequests below picks up the real
      // confirmation, which the effect further down auto-launches from.
      setInfo(data.message || t('toast.tourApproved'))
      setDismissedIncomingIds((prev) => new Set(prev).add(tourId))
      setActiveIncomingTour(null)
      await loadTourRequests()
    } catch (err) {
      setError(err.message || t('toast.couldNotApprove'))
      setActiveIncomingTour(null)
    } finally {
      setIncomingActionBusy(false)
    }
  }

  const handleIncomingNegotiate = async (tourId, price) => {
    setIncomingActionBusy(true)
    setError(''); setInfo('')
    try {
      const data = await sendDriverNegotiatedPrice(tourId, Number(price), token)
      // Popup stays open to show the pending-offer confirmation (mirrors the
      // "Negotiating" tab's card) instead of closing on a toast the driver
      // might miss — see awaitingOfferConfirmationIds above.
      setAwaitingOfferConfirmationIds((prev) => new Set(prev).add(tourId))
      await loadTourRequests()
      return data
    } catch (err) {
      throw err
    } finally {
      setIncomingActionBusy(false)
    }
  }

  const handleIncomingDismiss = (tourId) => {
    setDismissedIncomingIds((prev) => new Set(prev).add(tourId))
    setAwaitingOfferConfirmationIds((prev) => {
      const next = new Set(prev)
      next.delete(tourId)
      return next
    })
    setActiveIncomingTour(null)
  }

  useEffect(() => { 
    loadTourRequests()
    fetchProfile() 
  }, [loadTourRequests, fetchProfile])

  useEffect(() => {
    const id = setInterval(() => loadTourRequests(true), 2000)
    return () => clearInterval(id)
  }, [loadTourRequests])

  // Auto-launch the live-tracking screen the moment a tour this driver
  // offered on actually becomes confirmed — regardless of whether it got
  // there via direct-accept or a negotiated price, since both now go
  // through the same "traveler picks an offer" step rather than confirming
  // instantly. Without this, a negotiated tour's confirmation was only ever
  // visible as a quiet tab change, with nothing prompting the driver to
  // actually start driving — unlike the old direct-accept flow, which used
  // to (incorrectly, pre-confirmation) jump there right away.
  useEffect(() => {
    if (activeRideTourId) return
    const readyTour = tourRequests.find((t) =>
      t.status === 'confirmed' &&
      t.my_offer?.status === 'accepted' &&
      !launchedRideTourIdsRef.current.has(t.id)
    )
    if (readyTour) {
      launchedRideTourIdsRef.current.add(readyTour.id)
      setActiveRideTourId(readyTour.id)
    }
  }, [tourRequests, activeRideTourId])

  const handleUpdateProfile = (e) => {
    e.preventDefault()
    // Captured now, while the form is still mounted — the confirmation
    // dialog defers the actual save until the user taps "Confirm".
    const formData = new FormData(e.target)

    setConfirmState({
      isOpen: true,
      title: t('confirm.saveProfileTitle'),
      message: t('confirm.saveProfileMessage'),
      type: 'info',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }))
        setUpdatingProfile(true)
        try {
          await updateDriverProfile(formData, token)
          setEditMode(false)
          await fetchProfile()
          setProfileToast({ message: t('toast.profileUpdated'), type: 'success' })
        } catch (err) {
          setProfileToast({ message: err.message || t('toast.profileUpdateFailed'), type: 'error' })
        } finally {
          setUpdatingProfile(false)
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  const handleApprove = async (tourId, wasRejectedNegotiation = false) => {
    setConfirmState({
      isOpen: true,
      title: t('confirm.acceptTripTitle'),
      message: wasRejectedNegotiation
        ? t('confirm.acceptTripDeclined')
        : t('confirm.acceptTripMessage'),
      type: 'success',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }))
        setError(''); setInfo('')
        try {
          const data = await approveDriverTourRequest(tourId, token)
          // Same reasoning as handleIncomingAccept — this now only sends an
          // offer, not a confirmed booking, so no premature navigation here.
          setInfo(data.message || t('toast.tourApproved'))
          await loadTourRequests()
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }))
        } catch (err) {
          setError(err.message || t('toast.couldNotApprove'))
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  const handleSendPrice = async (tourId) => {
    const price = priceInputs[tourId]
    if (!price) { setError(t('toast.enterPriceFirst')); return }

    setConfirmState({
      isOpen: true,
      title: t('confirm.sendOfferTitle'),
      message: t('confirm.sendOfferMessage', { price: Number(price).toLocaleString() }),
      type: 'info',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }))
        setError(''); setInfo('')
        try {
          const data = await sendDriverNegotiatedPrice(tourId, Number(price), token)
          setInfo(data.message || t('toast.priceSent'))
          await loadTourRequests()
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }))
        } catch (err) {
          setError(err.message || t('toast.couldNotSendPrice'))
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  const filteredTours = useMemo(() => {
    if (activeTab === 'approved') {
      return tourRequests.filter(t => ['driver_approved', 'confirmed', 'en_route', 'arrived', 'ongoing'].includes(t.status))
    }
    if (activeTab === 'upcoming') {
      // Show new tour requests ('planned') AND user-confirmed trips waiting for drive start
      return tourRequests.filter(t => ['planned', 'confirmed'].includes(t.status))
    }
    if (activeTab === 'price_sent') return tourRequests.filter(t => ['price_sent_by_driver', 'rejected'].includes(t.status))
    return tourRequests
  }, [activeTab, tourRequests])

  const analytics = useMemo(() => computeDriverAnalytics(tourRequests), [tourRequests])
  const weeklyChart = useMemo(() => buildLast7DaysChart(tourRequests), [tourRequests])
  const statusChart = useMemo(() => buildStatusDistribution(tourRequests), [tourRequests])

  const tabCounts = useMemo(() => ({
    upcoming: tourRequests.filter((t) => ['planned', 'confirmed'].includes(t.status)).length,
    approved: tourRequests.filter((t) => ['driver_approved', 'confirmed', 'en_route', 'arrived', 'ongoing'].includes(t.status)).length,
    negotiating: tourRequests.filter((t) => ['price_sent_by_driver', 'rejected'].includes(t.status)).length,
  }), [tourRequests])

  const recentTours = useMemo(() => filteredTours.slice(0, 6), [filteredTours])

  const handlePriceChange = (tourId, value) => {
    setPriceInputs((prev) => ({ ...prev, [tourId]: value }))
  }

  const handleViewDetails = (tourId) => {
    setSelectedTourId(tourId)
    setShowDetailsModal(true)
  }

  const handleStartDriving = (tourId) => setActiveRideTourId(tourId)

  if (activeRideTourId) {
    return (
      <LiveHireDriver
        tourId={activeRideTourId}
        token={token}
        onBack={() => {
          setActiveRideTourId(null)
          loadTourRequests()
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-orange-50/30 font-sans text-slate-900 relative">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col justify-between bg-slate-900 border-r border-slate-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} min-h-screen`}>
        <div>
          <div className="flex items-center gap-4 px-6 py-6 border-b border-slate-800">
            <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden border border-slate-700 shadow-lg shadow-orange-500/10">
              <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            {sidebarOpen && <span className="text-lg font-bold text-white tracking-tight">{t('brand.name')}</span>}
          </div>
          <nav className="mt-6 px-3 space-y-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className={`${item.icon} text-lg flex-shrink-0`}></i>
                {sidebarOpen && <span className="flex-1 text-left">{t(item.labelKey)}</span>}
                {sidebarOpen && item.countKey && tabCounts[item.countKey] > 0 && (
                  <span className={`ml-auto min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-black ${
                    activeTab === item.id ? 'bg-white/20 text-white' : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {tabCounts[item.countKey]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="px-3 pb-8 space-y-2">
          {sidebarOpen ? (
            <div className="flex rounded-xl bg-slate-800 p-1 mb-1">
              {[{ code: 'en', key: 'lang.english' }, { code: 'si', key: 'lang.sinhala' }].map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLang(opt.code)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-all ${
                    lang === opt.code ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t(opt.key)}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setLang(lang === 'en' ? 'si' : 'en')}
              className="w-full flex items-center justify-center rounded-xl px-4 py-3 text-sm font-black text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title={t('header.language')}
            >
              <i className="bi bi-translate text-lg"></i>
            </button>
          )}
          <button onClick={() => setSidebarOpen(o => !o)} className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition">
            <i className={`bi bi-arrow-bar-${sidebarOpen ? 'left' : 'right'} text-lg`}></i>
            {sidebarOpen && <span>{t('nav.collapseMenu')}</span>}
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition">
            <i className="bi bi-box-arrow-left text-lg"></i>
            {sidebarOpen && <span>{t('nav.signOut')}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed top-0 left-0 h-full z-50 flex flex-col justify-between bg-slate-900 border-r border-slate-800 w-72 transition-all duration-300 lg:hidden ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          <div className="flex items-center gap-4 px-6 py-6 border-b border-slate-800">
            <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden border border-slate-700 shadow-lg shadow-orange-500/10">
              <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">{t('brand.name')}</span>
          </div>
          <nav className="mt-6 px-3 space-y-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className={`${item.icon} text-lg flex-shrink-0`}></i>
                <span className="flex-1 text-left">{t(item.labelKey)}</span>
                {item.countKey && tabCounts[item.countKey] > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-orange-500/30 text-[10px] font-black text-orange-200">
                    {tabCounts[item.countKey]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="px-3 pb-8 space-y-2">
          <div className="flex rounded-xl bg-slate-800 p-1 mb-1">
            {[{ code: 'en', key: 'lang.english' }, { code: 'si', key: 'lang.sinhala' }].map((opt) => (
              <button
                key={opt.code}
                onClick={() => setLang(opt.code)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-all ${
                  lang === opt.code ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition">
            <i className="bi bi-box-arrow-left text-lg"></i>
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        <header className="relative z-30 shrink-0 flex items-center justify-between bg-white/80 backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-5 shadow-sm border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <i className="bi bi-list text-xl"></i>
            </button>
            <h1 className="text-base sm:text-xl font-bold text-slate-800">
              {t(TAB_TITLE_KEYS[activeTab] || 'tabTitle.all')}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => loadTourRequests()} disabled={loading} className="flex items-center gap-2 text-slate-600 hover:text-orange-500 text-sm font-bold transition-colors">
              <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`}></i>
              {loading ? t('header.refreshing') : t('header.refresh')}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative h-10 w-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                  showNotifications ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <i className="bi bi-bell-fill"></i>
                {notifications.filter(n => n.status !== 'read').length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
                    {notifications.filter(n => n.status !== 'read').length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (() => {
                const unreadCount = notifications.filter(n => n.status !== 'read').length
                return (
                  <div className="absolute -right-16 sm:right-0 mt-4 w-[calc(100vw-2rem)] sm:w-96 max-w-[380px] sm:max-w-none bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top sm:origin-top-right">
                    {/* Dropdown Header */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{t('header.notifications')}</h4>
                        <div className="flex items-center gap-1.5">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllNotifRead}
                              className="text-[10px] font-bold text-[#1a2e6f] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                            >
                              {t('header.markAllRead')}
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleClearAllNotifs}
                              className="text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition"
                            >
                              {t('header.clearAll')}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {unreadCount > 0 ? <span className="text-orange-500">{unreadCount} {t('header.unread')}</span> : t('header.allRead')} · {notifications.length} {t('header.total')}
                      </p>
                    </div>

                    {/* Items */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center">
                          <i className="bi bi-bell-slash text-3xl text-slate-200 mb-3 block"></i>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('header.noNotifications')}</p>
                        </div>
                      ) : (
                        notifications.map(n => {
                          const isUnread = n.status !== 'read'
                          return (
                            <div
                              key={n.id}
                              onClick={() => {
                                if (isUnread) handleMarkNotifRead(n.id)
                                if (n.tour_id) { setSelectedTourId(n.tour_id); setShowDetailsModal(true); setShowNotifications(false) }
                              }}
                              className={`group p-5 transition-colors cursor-pointer ${
                                isUnread ? 'bg-orange-50/40 hover:bg-orange-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex gap-4 items-start">
                                {/* Unread dot */}
                                <div className="flex-shrink-0 pt-1.5">
                                  <div className={`h-2 w-2 rounded-full ${
                                    isUnread ? 'bg-orange-500' : 'bg-slate-200'
                                  }`} />
                                </div>
                                {/* Icon */}
                                <div className={`h-10 w-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg ${
                                  n.subject?.toLowerCase().includes('cancelled') 
                                    ? (isUnread ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400') 
                                    : (isUnread ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-400')
                                }`}>
                                  <i className={`bi ${
                                    n.subject?.toLowerCase().includes('cancelled') ? 'bi-x-circle-fill' : 'bi-info-circle-fill'
                                  }`}></i>
                                </div>
                                {/* Body */}
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm leading-tight mb-1 ${
                                    isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-500'
                                  }`}>{n.subject}</p>
                                  <p className={`text-xs leading-relaxed ${
                                    isUnread ? 'text-slate-600' : 'text-slate-400'
                                  }`}>{n.message}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                      {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                    </p>
                                    {n.tour_id && (
                                      <span className="text-[9px] font-black text-orange-500 uppercase tracking-wider">
                                        → Trip #{n.tour_id}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Dismiss */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDismissNotif(n.id) }}
                                  className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                                >
                                  <i className="bi bi-x-lg text-[11px]"></i>
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 leading-none">{userName || t('header.driver')}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{t('header.professionalDriver')}</p>
              </div>
              <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm">
                {profileData?.profile_photo ? (
                  <img src={driverUploadUrl(profileData.profile_photo)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (userName || 'D').charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-8 pt-6 sm:pt-8 pb-6 space-y-8">
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 font-bold flex items-center gap-3"><i className="bi bi-exclamation-triangle-fill"></i> {error}</div>}
          {info && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-700 font-bold flex items-center gap-3"><i className="bi bi-check-circle-fill"></i> {info}</div>}

          {activeTab === 'all' && (
            <>
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 p-6 sm:p-8 text-white shadow-2xl shadow-slate-900/20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.35),transparent_50%)]" />
                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
                <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  <div className="lg:col-span-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300/80 mb-2">{t('overview.totalEarnings')}</p>
                    <p className="text-4xl sm:text-5xl font-black tracking-tight">{formatCurrency(analytics.totalEarnings)}</p>
                    <p className="text-sm text-slate-300 mt-2 font-medium">{t('overview.fromCompletedTours', { count: analytics.completedCount, plural: analytics.completedCount !== 1 ? 's' : '' })}</p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: t('overview.pending'), value: formatCurrency(analytics.pendingEarnings), sub: t('overview.inPipeline') },
                      { label: t('overview.avgPerTrip'), value: formatCurrency(analytics.avgPerTrip), sub: t('overview.completedLabel') },
                      { label: t('overview.completion'), value: `${analytics.completionRate}%`, sub: t('overview.successRate') },
                      { label: t('overview.distance'), value: `${analytics.totalKm.toFixed(0)} km`, sub: t('overview.totalDriven') },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-200/70">{item.label}</p>
                        <p className="text-lg font-black mt-1">{item.value}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                <DashboardStatCard label={t('overview.totalRequests')} value={analytics.total} icon="bi-clipboard-data" accent="blue" sub={t('overview.allAssignedTours')} />
                <DashboardStatCard label={t('overview.activeTours')} value={analytics.activeCount} icon="bi-car-front-fill" accent="emerald" sub={t('overview.inProgressOrConfirmed')} />
                <DashboardStatCard label={t('overview.negotiating')} value={analytics.negotiatingCount} icon="bi-chat-dots-fill" accent="orange" sub={t('overview.awaitingUserResponse')} />
                <DashboardStatCard label={t('overview.completedCard')} value={analytics.completedCount} icon="bi-trophy-fill" accent="violet" sub={t('overview.earned', { amount: formatCurrency(analytics.totalEarnings) })} />
                <DashboardStatCard
                  label={t('overview.rating')}
                  value={feedbackSummary?.total_feedbacks ? `${(feedbackSummary.average_rating || 0).toFixed(1)} ★` : t('overview.newDriver')}
                  icon="bi-star-fill"
                  accent="rose"
                  sub={feedbackSummary?.total_feedbacks ? t('overview.fromReviews', { count: feedbackSummary.total_feedbacks }) : t('overview.noReviewsYet')}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <DashboardChart data={weeklyChart} title={t('overview.earningsTripsChart')} barKey="trips" lineKey="earnings" />
                </div>
                <div>
                  {statusChart.length > 0 ? (
                    <DashboardPieChart data={statusChart} title={t('overview.tourStatusMix')} />
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-100 p-8 h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                      {t('overview.noTourDataYet')}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-black text-slate-900">{t('overview.recentTourRequests')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'upcoming', label: t('nav.upcoming'), count: tabCounts.upcoming },
                      { id: 'approved', label: t('nav.approved'), count: tabCounts.approved },
                      { id: 'price_sent', label: t('nav.negotiating'), count: tabCounts.negotiating },
                    ].map((link) => (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => setActiveTab(link.id)}
                        className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-all uppercase tracking-widest border border-orange-200"
                      >
                        {link.label} {link.count > 0 && `(${link.count})`}
                      </button>
                    ))}
                  </div>
                </div>
                <DriverTourListSection
                  tab="all"
                  tours={recentTours}
                  loading={loading}
                  priceInputs={priceInputs}
                  onPriceChange={handlePriceChange}
                  onViewDetails={handleViewDetails}
                  onApprove={handleApprove}
                  onSendPrice={handleSendPrice}
                  onStartDriving={handleStartDriving}
                  token={token}
                />
              </div>
            </>
          )}

          {['upcoming', 'approved', 'price_sent'].includes(activeTab) && (
            <DriverTourListSection
              tab={activeTab}
              tours={filteredTours}
              loading={loading}
              priceInputs={priceInputs}
              onPriceChange={handlePriceChange}
              onViewDetails={handleViewDetails}
              onApprove={handleApprove}
              onSendPrice={handleSendPrice}
              onStartDriving={handleStartDriving}
              token={token}
            />
          )}

          {activeTab === 'payments' && (
            <DriverPaymentsSection token={token} tourRequests={tourRequests} analytics={analytics} />
          )}

          {activeTab === 'feedbacks' && (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1a2e6f] via-[#243b88] to-indigo-900 p-6 sm:p-8 text-white shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.25),transparent_55%)]" />
                <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/80 mb-2">{t('feedbacks.myRatings')}</p>
                    <p className="text-4xl sm:text-5xl font-black">{feedbackSummary?.average_rating || 0} ★</p>
                    <p className="text-sm text-blue-100/70 mt-2">{t('feedbacks.fromReviews', { count: feedbackSummary?.total_feedbacks || 0 })}</p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 text-center backdrop-blur-sm">
                        <p className="text-[10px] font-black text-amber-400">{stars} ★</p>
                        <p className="text-lg font-black mt-1 text-white">{feedbackSummary?.breakdown?.[stars] || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm p-6">
                <h3 className="text-lg font-black text-slate-800 mb-4">{t('feedbacks.recentReviews')}</h3>
                {feedbacks.length === 0 ? (
                  <div className="text-center py-10">
                    <i className="bi bi-star text-4xl text-slate-200 mb-3 block"></i>
                    <p className="text-slate-500 font-medium">{t('feedbacks.noneYet')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map(fb => (
                      <div key={fb.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:shadow-sm transition">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-slate-800">{fb.user_name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{new Date(fb.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500 text-sm">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <i key={i} className={`bi bi-star${i < fb.rating ? '-fill' : ''}`}></i>
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 text-sm mt-2">{fb.comment || <span className="italic text-slate-400">{t('feedbacks.noComment')}</span>}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <DriverProfileSection
              profileData={profileData}
              editMode={editMode}
              setEditMode={setEditMode}
              updatingProfile={updatingProfile}
              onSubmit={handleUpdateProfile}
              userName={userName}
            />
          )}
        </div>
        <Footer variant="dashboard" portal="driver" />
      </main>

      <TourDetailsModal tourId={selectedTourId} token={token} isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} userRole="driver" />
      <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} type={confirmState.type} onConfirm={confirmState.onConfirm} onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} isLoading={confirmState.isLoading} />
      <IncomingTourRequestModal
        tour={activeIncomingTour}
        busy={incomingActionBusy}
        onAccept={handleIncomingAccept}
        onNegotiate={handleIncomingNegotiate}
        onDismiss={handleIncomingDismiss}
      />
      {profileToast && (
        <ProfileToast toast={profileToast} onClose={() => setProfileToast(null)} />
      )}
    </div>
  )
}

function ProfileToast({ toast, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 4000)
    return () => clearTimeout(id)
  }, [toast, onClose])

  const isSuccess = toast.type === 'success'
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl font-bold text-sm ${
        isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}
    >
      <i className={`bi ${isSuccess ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-triangle-fill text-rose-500'} text-lg`} />
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity ml-2">
        <i className="bi bi-x-lg text-xs" />
      </button>
    </div>
  )
}