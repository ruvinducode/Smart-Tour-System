import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveDriverTourRequest,
  getDriverTourRequests,
  sendDriverNegotiatedPrice,
  getDriverProfile,
  updateDriverProfile,
  getDriverNotifications,
  getApiBaseUrl,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  getDriverFeedbacks,
} from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'
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
import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

const NAV_ITEMS = [
  { id: 'all',         label: 'Dashboard',   icon: 'bi bi-grid-fill' },
  { id: 'upcoming',    label: 'Upcoming',    icon: 'bi bi-calendar-event-fill', countKey: 'upcoming' },
  { id: 'approved',    label: 'Approved',    icon: 'bi bi-check-circle-fill', countKey: 'approved' },
  { id: 'price_sent',  label: 'Negotiating', icon: 'bi bi-arrow-left-right', countKey: 'negotiating' },
  { id: 'payments',    label: 'Payments',    icon: 'bi bi-wallet2' },
  { id: 'feedbacks',   label: 'Feedbacks',   icon: 'bi bi-star-fill' },
  { id: 'profile',     label: 'My Profile',  icon: 'bi bi-person-circle' },
]

const TAB_TITLES = {
  all: 'Driver Dashboard',
  upcoming: 'Upcoming Tours',
  approved: 'Approved Tours',
  price_sent: 'Negotiating Requests',
  payments: 'Payments',
  feedbacks: 'My Feedbacks',
  profile: 'My Profile',
}

export default function DriverDashboardPage({ token, userName, onLogout }) {
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
  
  // Feedbacks State
  const [feedbacks, setFeedbacks] = useState([])
  
  // Profile State
  const [profileData, setProfileData] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [updatingProfile, setUpdatingProfile] = useState(false)

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
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

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
      const [tourData, notifData, feedbackData] = await Promise.all([
        getDriverTourRequests(token),
        getDriverNotifications(token),
        getDriverFeedbacks(token).catch(() => [])
      ])
      setTourRequests(Array.isArray(tourData) ? tourData : [])
      setNotifications(Array.isArray(notifData) ? notifData : [])
      setFeedbacks(Array.isArray(feedbackData) ? feedbackData : [])
    } catch (err) {
      if (!silent) setError(err.message || 'Could not load dashboard data')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token])

  useEffect(() => { 
    loadTourRequests()
    fetchProfile() 
  }, [loadTourRequests, fetchProfile])

  useEffect(() => {
    const id = setInterval(() => loadTourRequests(true), 2000)
    return () => clearInterval(id)
  }, [loadTourRequests])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setUpdatingProfile(true)
    setError(''); setInfo('')
    
    const formData = new FormData(e.target)
    
    try {
      await updateDriverProfile(formData, token)
      setInfo('Profile updated successfully!')
      setEditMode(false)
      fetchProfile()
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleApprove = async (tourId) => {
    setConfirmState({
      isOpen: true,
      title: 'Accept This Trip?',
      message: 'Are you sure you want to accept this tour request? You will be expected to provide transport services for this route.',
      type: 'success',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }))
        setError(''); setInfo('')
        try {
          const data = await approveDriverTourRequest(tourId, token)
          setInfo(data.message || 'Tour approved')
          setActiveRideTourId(tourId)
          await loadTourRequests()
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }))
        } catch (err) { 
          setError(err.message || 'Could not approve tour')
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  const handleSendPrice = async (tourId) => {
    const price = priceInputs[tourId]
    if (!price) { setError('Please enter a price first'); return }

    setConfirmState({
      isOpen: true,
      title: 'Send Counter-Offer?',
      message: `Are you sure you want to send a counter-offer of Rs. ${Number(price).toLocaleString()}? The user will need to accept this price.`,
      type: 'info',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }))
        setError(''); setInfo('')
        try {
          const data = await sendDriverNegotiatedPrice(tourId, Number(price), token)
          setInfo(data.message || 'Price sent to user')
          await loadTourRequests()
          setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }))
        } catch (err) { 
          setError(err.message || 'Could not send price')
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
            {sidebarOpen && <span className="text-lg font-bold text-white tracking-tight">Air B&C</span>}
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
                {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
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
          <button onClick={() => setSidebarOpen(o => !o)} className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition">
            <i className={`bi bi-arrow-bar-${sidebarOpen ? 'left' : 'right'} text-lg`}></i>
            {sidebarOpen && <span>Collapse Menu</span>}
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition">
            <i className="bi bi-box-arrow-left text-lg"></i>
            {sidebarOpen && <span>Sign Out</span>}
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
            <span className="text-lg font-bold text-white tracking-tight">Air B&C</span>
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
                <span className="flex-1 text-left">{item.label}</span>
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
          <button onClick={onLogout} className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition">
            <i className="bi bi-box-arrow-left text-lg"></i>
            <span>Sign Out</span>
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
              {TAB_TITLES[activeTab] || 'Driver Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => loadTourRequests()} disabled={loading} className="flex items-center gap-2 text-slate-600 hover:text-orange-500 text-sm font-bold transition-colors">
              <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`}></i>
              {loading ? 'Refreshing...' : 'Refresh'}
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
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Notifications</h4>
                        <div className="flex items-center gap-1.5">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllNotifRead}
                              className="text-[10px] font-bold text-[#1a2e6f] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                            >
                              Mark All Read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleClearAllNotifs}
                              className="text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {unreadCount > 0 ? <span className="text-orange-500">{unreadCount} unread</span> : 'All read'} · {notifications.length} total
                      </p>
                    </div>

                    {/* Items */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center">
                          <i className="bi bi-bell-slash text-3xl text-slate-200 mb-3 block"></i>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No notifications</p>
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
                <p className="text-sm font-bold text-slate-800 leading-none">{userName || 'Driver'}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Professional Driver</p>
              </div>
              <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm">
                {profileData?.profile_photo ? (
                  <img src={`${getApiBaseUrl()}/uploads/drivers/${profileData.profile_photo}`} alt="Profile" className="w-full h-full object-cover" />
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300/80 mb-2">Total Earnings</p>
                    <p className="text-4xl sm:text-5xl font-black tracking-tight">{formatCurrency(analytics.totalEarnings)}</p>
                    <p className="text-sm text-slate-300 mt-2 font-medium">From {analytics.completedCount} completed tour{analytics.completedCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Pending', value: formatCurrency(analytics.pendingEarnings), sub: 'In pipeline' },
                      { label: 'Avg / Trip', value: formatCurrency(analytics.avgPerTrip), sub: 'Completed' },
                      { label: 'Completion', value: `${analytics.completionRate}%`, sub: 'Success rate' },
                      { label: 'Distance', value: `${analytics.totalKm.toFixed(0)} km`, sub: 'Total driven' },
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <DashboardStatCard label="Total Requests" value={analytics.total} icon="bi-clipboard-data" accent="blue" sub="All assigned tours" />
                <DashboardStatCard label="Active Tours" value={analytics.activeCount} icon="bi-car-front-fill" accent="emerald" sub="In progress or confirmed" />
                <DashboardStatCard label="Negotiating" value={analytics.negotiatingCount} icon="bi-chat-dots-fill" accent="orange" sub="Awaiting user response" />
                <DashboardStatCard label="Completed" value={analytics.completedCount} icon="bi-trophy-fill" accent="violet" sub={`${formatCurrency(analytics.totalEarnings)} earned`} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <DashboardChart data={weeklyChart} title="Earnings & Trips (Last 7 Days)" barKey="trips" lineKey="earnings" />
                </div>
                <div>
                  {statusChart.length > 0 ? (
                    <DashboardPieChart data={statusChart} title="Tour Status Mix" />
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-100 p-8 h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                      No tour data yet
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-black text-slate-900">Recent Tour Requests</h2>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
                      { id: 'approved', label: 'Approved', count: tabCounts.approved },
                      { id: 'price_sent', label: 'Negotiating', count: tabCounts.negotiating },
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
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <i className="bi bi-star-fill text-xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">My Feedbacks</h3>
                  <p className="text-sm text-slate-500">What clients are saying about your service.</p>
                </div>
              </div>
              
              {feedbacks.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                  <i className="bi bi-chat-square-text text-4xl text-slate-300 mb-3 block"></i>
                  <h4 className="text-lg font-bold text-slate-800">No feedbacks yet</h4>
                  <p className="text-slate-500 mt-1">Complete tours to receive feedback from users.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {feedbacks.map(fb => (
                    <div key={fb.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                            {fb.user_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{fb.user_name}</p>
                            <p className="text-xs text-slate-500">{new Date(fb.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center bg-amber-50 px-2 py-1 rounded-lg">
                          <i className="bi bi-star-fill text-amber-500 mr-1 text-sm"></i>
                          <span className="font-bold text-amber-700 text-sm">{fb.rating}/5</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-700 text-sm italic">"{fb.comment || 'No comment provided.'}"</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400">Tour ID: #{fb.tour_id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <DriverProfileSection
              profileData={profileData}
              editMode={editMode}
              setEditMode={setEditMode}
              updatingProfile={updatingProfile}
              onSubmit={handleUpdateProfile}
              getApiBaseUrl={getApiBaseUrl}
              userName={userName}
            />
          )}
        </div>
        <Footer variant="dashboard" portal="driver" />
      </main>

      <TourDetailsModal tourId={selectedTourId} token={token} isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} userRole="driver" />
      <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} type={confirmState.type} onConfirm={confirmState.onConfirm} onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} isLoading={confirmState.isLoading} />
    </div>
  )
}