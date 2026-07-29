import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  MapPin, 
  Calendar, 
  Clock, 
  Bell, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Star, 
  Navigation, 
  Plus, 
  Search, 
  User, 
  CreditCard,
  TrendingUp,
  Map as MapIcon,
  ShieldCheck,
  Compass,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  Menu,
  Trash2
} from 'lucide-react'
import { getUserNotifications, getUserTours, cancelTour, deleteTour, acceptDriverPrice, rejectDriverPrice, driverUploadUrl, replyToDriver, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications, submitFeedback } from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'
import LiveTrackingPage from './LiveTrackingPage.jsx'
import LiveTrackingPanel from '../components/LiveTrackingPanel.jsx'
import CancellationModal from '../components/CancellationModal.jsx'
import FeedbackModal from '../components/FeedbackModal.jsx'
import DashboardChart from '../components/DashboardChart.jsx'
import DashboardStatCard from '../components/DashboardStatCard.jsx'
import Footer from '../components/Footer.jsx'
import { buildLast7DaysChart, computeUserAnalytics, formatCurrency } from '../utils/dashboardAnalytics.js'
import {
  canUserStartLiveTracking,
  formatTourSchedule,
  isUserAwaitingScheduleStart,
} from '../utils/tourSchedule.js'

// --- Professional Design Tokens ---
const THEME = {
  primary: { // Green
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  accent: { // Orange
    50: '#fff7ed',
    100: '#ffedd5',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    400: '#94a3b8',
    800: '#1e293b',
    900: '#0f172a',
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
}

export default function UserDashboardPage({ token, userName, onLogout, onGoToPlanner }) {
  const [tours, setTours] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // ── Live Tracking State ──
  const [liveTrackingTourId, setLiveTrackingTourId] = useState(null)
  const [liveTrackingMode, setLiveTrackingMode] = useState(null) // 'full' | 'panel' | null
  const [liveTrackingTour, setLiveTrackingTour] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // ── Panel Feedback State (for driver-cancelled or user-cancelled from panel) ──
  const [showPanelFeedback, setShowPanelFeedback] = useState(false)
  const [panelFeedbackTourId, setPanelFeedbackTourId] = useState(null)
  const [panelFeedbackDriverName, setPanelFeedbackDriverName] = useState('')
  const [submittingPanelFeedback, setSubmittingPanelFeedback] = useState(false)
  const panelFeedbackShownRef = { current: false }

  // ── New Dashboard & Deletion States ──
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [tourIdToDelete, setTourIdToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState('active')

  // Account Settings States
  const [settingsName, setSettingsName] = useState(userName || '')
  const [settingsPhone, setSettingsPhone] = useState('+94 77 123 4567')
  const [settingsCountry, setSettingsCountry] = useState('Sri Lanka')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [scheduleTick, setScheduleTick] = useState(0)

  useEffect(() => {
    if (userName) setSettingsName(userName)
  }, [userName])

  useEffect(() => {
    const interval = setInterval(() => setScheduleTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDeleteConfirm = async () => {
    if (!tourIdToDelete) return
    setDeleting(true)
    try {
      await deleteTour(tourIdToDelete, token)
      setShowDeleteConfirmModal(false)
      setTourIdToDelete(null)
      loadDashboardData()
    } catch (err) {
      alert(err.message || 'Failed to delete tour')
    } finally {
      setDeleting(false)
    }
  }

  // ── Notification Handlers ──
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

  const [negotiationLoading, setNegotiationLoading] = useState(false)

  const handleAcceptOffer = async (tourId) => {
    setNegotiationLoading(true)
    try {
      await acceptDriverPrice(tourId, token)
      alert('Price offer accepted successfully!')
      loadDashboardData()
    } catch (err) {
      alert(err.message || 'Failed to accept price offer')
    } finally {
      setNegotiationLoading(false)
    }
  }

  const handleRejectOffer = async (tourId) => {
    setNegotiationLoading(true)
    try {
      await rejectDriverPrice(tourId, token)
      alert('Price offer rejected.')
      loadDashboardData()
    } catch (err) {
      alert(err.message || 'Failed to reject price offer')
    } finally {
      setNegotiationLoading(false)
    }
  }

  const [negotiationReply, setNegotiationReply] = useState('')

  const getDriverImageUrl = (path) => driverUploadUrl(path)

  const handleSendReply = async (tourId) => {
    if (!negotiationReply.trim()) return
    setNegotiationLoading(true)
    try {
      await replyToDriver(tourId, negotiationReply, token)
      alert('Reply sent to driver successfully!')
      setNegotiationReply('')
      loadDashboardData()
    } catch (err) {
      alert(err.message || 'Failed to send reply')
    } finally {
      setNegotiationLoading(false)
    }
  }




  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [tourData, notifData] = await Promise.all([
        getUserTours(token),
        getUserNotifications(token)
      ])
      const toursArr = Array.isArray(tourData) ? tourData : []
      setTours(toursArr)
      setNotifications(Array.isArray(notifData) ? notifData : [])

      const activeStatuses = ['driver_approved', 'confirmed', 'en_route', 'arrived', 'ongoing']
      const activeTour = toursArr.find((t) => activeStatuses.includes(t.status) && canUserStartLiveTracking(t))

      if (activeTour && !liveTrackingTourId) {
        setLiveTrackingTourId(activeTour.id)
        setLiveTrackingTour(activeTour)
        setLiveTrackingMode('panel')
      }

      if (liveTrackingTourId) {
        const trackedTour = toursArr.find((t) => t.id === liveTrackingTourId)
        if (!trackedTour) {
          setLiveTrackingMode(null)
          setLiveTrackingTourId(null)
          setLiveTrackingTour(null)
        } else if (trackedTour.status === 'completed' || trackedTour.status === 'cancelled') {
          // If tour ended and we're still in panel mode, switch to full mode so FeedbackModal can show
          if (liveTrackingMode === 'panel') {
            setLiveTrackingMode('full')
          }
          setLiveTrackingTour(trackedTour)
        } else if (!canUserStartLiveTracking(trackedTour)) {
          setLiveTrackingMode(null)
          setLiveTrackingTourId(null)
          setLiveTrackingTour(null)
        } else {
          setLiveTrackingTour(trackedTour)
        }
      }
    } catch (err) {
      console.error('Dashboard load failed', err)
      if (err.message?.toLowerCase().includes('token has expired') || err.message?.includes('401')) {
        onLogout()
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token, onLogout, liveTrackingTourId])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  useEffect(() => {
    const id = setInterval(() => loadDashboardData(true), 2000)
    return () => clearInterval(id)
  }, [loadDashboardData])

  const upcomingTours = useMemo(() => 
    tours.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'rejected'), 
    [tours]
  )

  const pastTours = useMemo(() => 
    tours.filter(t => t.status === 'completed' || t.status === 'cancelled' || t.status === 'rejected'), 
    [tours]
  )

  const negotiationTours = useMemo(() => 
    tours.filter(t => t.status === 'price_sent_by_driver'), 
    [tours]
  )



  const stats = useMemo(() => computeUserAnalytics(tours), [tours])
  const weeklyChart = useMemo(() => buildLast7DaysChart(tours), [tours])
  const scheduledUpcomingTour = useMemo(
    () => tours.find((t) => isUserAwaitingScheduleStart(t)),
    [tours, scheduleTick]
  )

  const isEndedTour = liveTrackingTour && (liveTrackingTour.status === 'completed' || liveTrackingTour.status === 'cancelled')

  if (liveTrackingMode === 'full' && liveTrackingTourId && (canUserStartLiveTracking(liveTrackingTour) || isEndedTour)) {
    return (
      <LiveTrackingPage
        tourId={liveTrackingTourId}
        token={token}
        userLat={liveTrackingTour?.pickup_lat}
        userLng={liveTrackingTour?.pickup_lng}
        onBack={() => {
          if (liveTrackingTour && (liveTrackingTour.status === 'completed' || liveTrackingTour.status === 'cancelled')) {
             setLiveTrackingTourId(null)
             setLiveTrackingMode(null)
          } else {
             setLiveTrackingMode('panel')
          }
        }}
      />
    )
  }

  const handleCancelConfirm = async (reason) => {
    if (!liveTrackingTourId) return
    setCancelling(true)
    try {
      await cancelTour(liveTrackingTourId, reason, token)
      setShowCancelModal(false)
      // If driver was assigned, switch to full mode so FeedbackModal shows
      // Otherwise just clear the tracking state
      if (liveTrackingTour?.driver_name) {
        setLiveTrackingMode('full')
      } else {
        setLiveTrackingMode(null)
        setLiveTrackingTourId(null)
      }
      loadDashboardData()
    } catch (err) {
      alert(err.message || 'Failed to cancel tour')
    } finally {
      setCancelling(false)
    }
  }

  const handlePanelFeedbackSubmit = async (rating, comment) => {
    setSubmittingPanelFeedback(true)
    try {
      await submitFeedback(panelFeedbackTourId, rating, comment, token)
      setShowPanelFeedback(false)
      setPanelFeedbackTourId(null)
      setLiveTrackingMode(null)
      setLiveTrackingTourId(null)
      setLiveTrackingTour(null)
    } catch (err) {
      alert(err.message || 'Failed to submit feedback')
    } finally {
      setSubmittingPanelFeedback(false)
    }
  }

  const SidebarItem = ({ icon: Icon, label, id, active }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
        active 
        ? 'bg-orange-500 text-white shadow-lg shadow-blue-600/20' 
        : 'text-white hover:bg-slate-50 hover:text-orange-500'
      }`}
    >
      <Icon size={18} className={active ? 'text-white' : 'text-white group-hover:scale-110 transition-transform'} />
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeTabIndicator"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400"
        />
      )}
    </button>
  )

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/20 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-72 bg-slate-900 border-r border-slate-800 flex-col fixed h-screen overflow-y-auto scrollbar-hide z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Compass className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-white">AIR B & C</h1>
              <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mt-1">Tourism Dashboard</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <SidebarItem icon={LayoutDashboard} label="Overview" id="overview" active={activeTab === 'overview'} />
            <SidebarItem icon={MapIcon} label="My Trips" id="trips" active={activeTab === 'trips'} />
            <SidebarItem icon={Bell} label="Notifications" id="notifications" active={activeTab === 'notifications'} />
            <SidebarItem icon={Star} label="Travel Bucket" id="saved" active={activeTab === 'saved'} />
            <SidebarItem icon={CreditCard} label="Payments" id="payments" active={activeTab === 'payments'} />
            <SidebarItem icon={Settings} label="Account" id="settings" active={activeTab === 'settings'} />
          </nav>
        </div>

        <div className="mt-auto p-8">
          <div className="bg-orange-50 rounded-[2rem] p-6 border border-orange-100 mb-8 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Upgrade Plan</span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight mb-4">Get 20% off on your next booking!</p>
              <button className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Go Premium <ChevronRight size={12} />
              </button>
            </div>
            <div className="absolute -bottom-6 -right-6 opacity-10 text-orange-600">
               <Star size={80} />
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col overflow-hidden">
        {/* ── Top Header ── */}
        <header className="sticky top-0 z-40 shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-50 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search your journeys..." 
                className="bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-3 text-sm font-medium w-80 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="h-9 w-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-600/20">
                 {userName?.[0] || 'U'}
               </div>
               <div className="leading-tight">
                 <p className="text-xs font-black text-slate-900">{userName || 'Explorer'}</p>
                 <p className="text-[10px] font-bold text-orange-500 mt-0.5 tracking-tight">Active Traveler</p>
               </div>
            </div>
            <button 
              onClick={() => setActiveTab('notifications')}
              className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-orange-100 transition-all relative group"
            >
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              {notifications.length > 0 && (
                <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-8 md:p-12 max-w-7xl mx-auto w-full">
          {/* ── Tab Views ── */}
          {activeTab === 'overview' && (
            <div className="space-y-12">
              {/* Welcome Section */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                      Ayubowan, {userName?.split(' ')[0] || 'Traveler'}!
                    </h2>
                    <p className="text-slate-500 font-bold mt-2 text-lg">Your Sri Lankan adventure continues today.</p>
                  </div>
                  <button 
                    onClick={onGoToPlanner}
                    className="bg-orange-500 text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center gap-3 hover:bg-orange-600 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-600/30"
                  >
                    <Plus size={20} />
                    PLAN NEW TRIP
                  </button>
                </div>
              </motion.div>


              {/* Stats Grid */}
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <DashboardStatCard label="Total Trips" value={stats.totalTrips} icon={<MapIcon size={22} />} accent="blue" sub={`${stats.completedTrips} completed`} />
                <DashboardStatCard label="Active Now" value={stats.activeTrips} icon={<Navigation size={22} />} accent="emerald" sub="Ongoing journeys" />
                <DashboardStatCard label="Total Spent" value={formatCurrency(stats.totalSpent)} icon={<CreditCard size={22} />} accent="orange" sub="Lifetime travel spend" />
                <DashboardStatCard label="Distance" value={`${stats.totalDistance} km`} icon={<TrendingUp size={22} />} accent="violet" sub={`${stats.negotiations} open offers`} />
              </motion.div>

              <DashboardChart
                data={weeklyChart}
                title="Spending & Travel Activity (Last 7 Days)"
                barKey="trips"
                lineKey="spending"
              />

              {scheduledUpcomingTour && (
                <div className="rounded-[2rem] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Calendar size={22} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-1">Scheduled Tour</p>
                    <p className="text-base font-black text-slate-900">
                      Live tracking starts on <span className="text-amber-700">{formatTourSchedule(scheduledUpcomingTour)}</span>
                    </p>
                    <p className="text-sm text-slate-600 mt-1 font-medium">
                      Your driver is confirmed. Tracking unlocks automatically on the scheduled start date.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Main Column */}
                <div className="lg:col-span-8 space-y-12">
                  <section>
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                        <div className="h-8 w-2 rounded-full bg-orange-500"></div>
                        Current Itinerary
                      </h3>
                    </div>

                    {loading ? (
                      <div className="space-y-6">
                        {[1, 2].map(i => <div key={i} className="h-64 bg-slate-50 rounded-[3rem] animate-pulse"></div>)}
                      </div>
                    ) : upcomingTours.length === 0 ? (
                      <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center group">
                        <div className="h-28 w-28 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-8 group-hover:rotate-12 transition-transform duration-500">
                          <Compass className="text-orange-500" size={48} />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 mb-3">No active trips</h4>
                        <p className="text-slate-500 max-w-sm mx-auto mb-10 font-bold leading-relaxed">Ready for a new adventure? Explore Sri Lanka's hidden gems now.</p>
                        <button onClick={onGoToPlanner} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl active:scale-95">
                          Discover Destinations
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {upcomingTours.map((tour, idx) => {
                          const canTrack = canUserStartLiveTracking(tour)
                          const awaitingSchedule = isUserAwaitingScheduleStart(tour)
                          const isLive = canTrack
                          return (
                            <motion.div
                              key={tour.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className={`bg-white rounded-3xl md:rounded-[3rem] border transition-all duration-500 p-6 md:p-8 relative overflow-hidden ${
                                isLive ? 'border-blue-200 shadow-[0_20px_60px_rgba(34,197,94,0.1)]' : 'border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)]'
                              }`}
                            >
                              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-orange-500">
                                <MapIcon size={240} />
                              </div>

                              <div className="relative z-10">
                                <div className="flex flex-wrap justify-between items-start gap-8 mb-10">
                                  <div className="flex items-center gap-6">
                                    <div className={`h-20 w-20 rounded-[2rem] flex items-center justify-center shadow-lg ${
                                      isLive ? 'bg-orange-500 text-white shadow-blue-600/20' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                      <Navigation size={40} className={isLive ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Expedition #{tour.id}</span>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                          tour.status === 'ongoing' ? 'bg-blue-500 text-white' :
                                          tour.status === 'driver_approved' ? 'bg-orange-500 text-white' :
                                          'bg-slate-100 text-slate-500'
                                        }`}>
                                          {tour.status.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <h4 className="text-3xl font-black text-slate-900 tracking-tight">{tour.total_distance_km} km Journey</h4>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fare</p>
                                    <p className="text-3xl font-black text-slate-900">Rs. {Number(tour.driver_price || tour.estimated_price).toLocaleString()}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                                  {[
                                    { icon: Calendar, label: 'Start Date', value: tour.start_date || 'TBD' },
                                    { icon: Clock, label: 'Period', value: `${tour.total_days} Days` },
                                    { icon: MapPin, label: 'Itinerary', value: `${tour.stops?.length || 0} Stops` },
                                    { icon: ShieldCheck, label: 'Guardian', value: tour.driver_name || 'Finding...' },
                                  ].map((item, i) => (
                                    <div key={i} className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100/50">
                                      <div className="flex items-center gap-2 mb-2">
                                        <item.icon size={14} className="text-orange-500" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                      </div>
                                      <p className="text-sm font-black text-slate-900">{item.value}</p>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-5">
                                  <button onClick={() => { setSelectedTourId(tour.id); setShowDetailsModal(true) }} className="flex-1 py-5 bg-slate-50 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-3 border border-slate-200">
                                    <ExternalLink size={18} />
                                    Full Details
                                  </button>
                                  {tour.status === 'planned' && (
                                    <button 
                                      onClick={() => { setTourIdToDelete(tour.id); setShowDeleteConfirmModal(true); }}
                                      className="flex-1 py-5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-rose-100 shadow-sm"
                                    >
                                      <Trash2 size={18} />
                                      Delete Trip
                                    </button>
                                  )}
                                  {canTrack ? (
                                    <button onClick={() => { setLiveTrackingTourId(tour.id); setLiveTrackingTour(tour); setLiveTrackingMode('full') }} className="flex-[1.5] py-5 bg-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3">
                                      <Navigation size={18} />
                                      Track Live Journey
                                    </button>
                                  ) : awaitingSchedule ? (
                                    <div className="flex-[1.5] py-5 px-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold flex items-center justify-center gap-3 text-center">
                                      <Calendar size={18} className="shrink-0" />
                                      Live tracking starts {formatTourSchedule(tour)}
                                    </div>
                                  ) : (
                                    <button disabled className="flex-[1.5] py-5 bg-slate-50 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 cursor-not-allowed">
                                      <Clock size={18} />
                                      Awaiting Driver
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  {/* Insights Section */}
                  <section className="bg-slate-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden group">
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                      <div>
                        <div className="flex items-center gap-4 mb-8">
                          <div className="h-14 w-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-2xl shadow-orange-500/40">
                            <TrendingUp size={28} />
                          </div>
                          <h4 className="text-3xl font-black tracking-tight">Travel Statistics</h4>
                        </div>
                        <p className="text-slate-400 font-bold leading-relaxed mb-10 text-lg">
                          You've explored <span className="text-orange-400">12% more</span> of the island this year. Reach 50% to become a "Ceylon Master".
                        </p>
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3">
                              <span className="text-slate-500">Island Mastery</span>
                              <span className="text-blue-400">45% Completed</span>
                            </div>
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                              <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} transition={{ duration: 1.5 }} className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-20"></div>
                          <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity }} className="bg-slate-800/80 backdrop-blur-2xl border border-slate-700 p-8 rounded-[2.5rem] relative z-10 text-center border-t-white/10">
                             <Star className="text-orange-400 mx-auto mb-6" size={48} fill="currentColor" />
                             <p className="text-3xl font-black mb-1">Voyager Pro</p>
                             <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Next Tier: Explorer Elite</p>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                       <Compass size={280} />
                    </div>
                  </section>
                </div>

                {/* Sidebar Column */}
                <div className="lg:col-span-4 space-y-12">
                  <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <h3 className="text-lg font-black text-slate-900 mb-8">Shortcuts</h3>
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { label: 'New Stop', icon: MapPin, color: 'blue' },
                        { label: 'Inbox', icon: MessageSquare, color: 'orange' },
                        { label: 'Billing', icon: CreditCard, color: 'blue' },
                        { label: 'Help', icon: AlertCircle, color: 'orange' },
                      ].map((action, i) => (
                        <button key={i} className="flex flex-col items-center gap-4 p-6 rounded-3xl hover:bg-slate-50 transition-all group">
                          <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all group-hover:scale-110 shadow-sm ${
                            action.color === 'blue' ? 'bg-blue-50 text-orange-500' : 'bg-orange-50 text-orange-600'
                          }`}>
                            <action.icon size={28} />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-black text-slate-900">Activity</h3>
                      <div className="flex items-center gap-2">
                        {notifications.filter(n => n.status !== 'read').length > 0 && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full uppercase tracking-tighter">
                            {notifications.filter(n => n.status !== 'read').length} Unread
                          </span>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={handleClearAllNotifs}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                      {notifications.length === 0 ? (
                        <div className="py-16 text-center">
                          <Bell className="text-slate-200 mx-auto mb-6" size={48} />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No recent alerts</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((note, idx) => {
                          const isUnread = note.status !== 'read'
                          return (
                            <motion.div 
                              key={note.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                              className={`group p-5 rounded-[1.5rem] border transition-all ${
                                isUnread ? 'bg-orange-50/40 border-orange-100 hover:bg-orange-50' : 'bg-white border-slate-50 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex gap-4">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                  isUnread ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  <Bell size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm leading-tight mb-1 ${
                                      isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-600'
                                    }`}>{note.subject}</p>
                                    {isUnread && <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0 mt-1"></div>}
                                  </div>
                                  <p className={`text-[11px] leading-relaxed line-clamp-2 mb-3 ${
                                    isUnread ? 'text-slate-600 font-medium' : 'text-slate-400'
                                  }`}>{note.message}</p>
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => {
                                        if (isUnread) handleMarkNotifRead(note.id)
                                        if (note.tour_id) { setSelectedTourId(note.tour_id); setShowDetailsModal(true) }
                                        else setActiveTab('trips')
                                      }}
                                      className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] hover:text-orange-600 transition-colors flex items-center gap-1"
                                    >
                                      View Journey <ChevronRight size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDismissNotif(note.id)}
                                      className="text-[10px] text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (() => {
            const unreadCount = notifications.filter(n => n.status !== 'read').length
            return (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Notifications</h2>
                    <p className="text-slate-400 font-bold mt-2 text-sm">
                      {unreadCount > 0 ? <span className="text-orange-500">{unreadCount} unread</span> : 'All caught up'} · {notifications.length} total
                    </p>
                  </div>
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllNotifRead}
                          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-xl transition"
                        >
                          <CheckCircle2 size={14} /> Mark All Read
                        </button>
                      )}
                      <button
                        onClick={handleClearAllNotifs}
                        className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 border border-rose-100 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition"
                      >
                        <Trash2 size={14} /> Clear Inbox
                      </button>
                    </div>
                  )}
                </div>

                {/* Notification cards */}
                {notifications.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="h-24 w-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <Bell className="text-slate-200" size={40} />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No notifications to display.</p>
                    <p className="text-slate-300 text-xs mt-2">System updates and tour alerts will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((note, idx) => {
                      const isUnread = note.status !== 'read'
                      return (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                          className={`group relative bg-white rounded-[2.5rem] border shadow-sm transition-all flex gap-6 p-8 ${
                            isUnread
                              ? 'border-orange-200 bg-orange-50/30 shadow-orange-100/50'
                              : 'border-slate-100'
                          }`}
                        >
                          {/* Unread accent bar */}
                          {isUnread && <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-orange-500"></div>}

                          {/* Icon */}
                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            isUnread ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <Bell size={24} />
                          </div>

                          {/* Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <h4 className={`text-lg leading-tight ${
                                isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-600'
                              }`}>{note.subject}</h4>
                              {isUnread && (
                                <span className="flex-shrink-0 h-2.5 w-2.5 rounded-full bg-orange-500 mt-2"></span>
                              )}
                            </div>
                            <p className={`mb-6 leading-relaxed ${
                              isUnread ? 'text-slate-600 font-bold text-sm' : 'text-slate-400 font-medium text-sm'
                            }`}>{note.message}</p>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => {
                                  if (isUnread) handleMarkNotifRead(note.id)
                                  if (note.tour_id) { setSelectedTourId(note.tour_id); setShowDetailsModal(true) }
                                  else {
                                    const match = note.message?.match(/#(\d+)/) || note.subject?.match(/#(\d+)/)
                                    if (match) { setSelectedTourId(match[1]); setShowDetailsModal(true) }
                                  }
                                }}
                                className="bg-orange-500 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                              >
                                <ExternalLink size={14} /> Review Details
                              </button>
                              {isUnread && (
                                <button
                                  onClick={() => handleMarkNotifRead(note.id)}
                                  className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition"
                                >
                                  <CheckCircle2 size={14} /> Mark as Read
                                </button>
                              )}
                              <span className="ml-auto text-[10px] text-slate-300 font-medium">
                                {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                          </div>

                          {/* Dismiss button */}
                          <button
                            onClick={() => handleDismissNotif(note.id)}
                            className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-slate-200 hover:bg-rose-50 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 self-start mt-1"
                            title="Dismiss"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {activeTab === 'saved' && (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Travel Bucket</h2>
                  <p className="text-slate-500 font-bold mt-2">Discover and plan your next destination in Sri Lanka.</p>
                </div>
                <button onClick={onGoToPlanner} className="bg-orange-500 text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center gap-3 hover:bg-green-700 transition-all shadow-xl shadow-blue-600/20">
                  <Plus size={18} /> Plan Custom Trip
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    name: 'Sigiriya Lion Rock',
                    desc: 'Ancient palace fortress towering 200m above the jungle, rich with murals and gardens.',
                    tag: 'Heritage',
                    rating: '4.9',
                    img: '/travel_bucket/sigiriya_lion_rock_1780037149392.png'
                  },
                  {
                    name: 'Ella Nine Arch',
                    desc: 'Scenic mountain village surrounded by lush tea plantations, waterfalls, and iconic train bridges.',
                    tag: 'Adventure',
                    rating: '4.8',
                    img: '/travel_bucket/ella_nine_arch_1780037300229.png'
                  },
                  {
                    name: 'Galle Dutch Fort',
                    desc: 'Coastal UNESCO World Heritage site blending colonial history with modern ocean-side vibes.',
                    tag: 'Coastal',
                    rating: '4.7',
                    img: '/travel_bucket/galle_dutch_fort_1780037451501.png'
                  },
                  {
                    name: 'Yala Safari',
                    desc: "Coastal national park boasting one of the world's highest leopard density populations.",
                    tag: 'Wildlife',
                    rating: '4.8',
                    img: '/travel_bucket/ella_nine_arch_1780037300229.png'
                  },
                  {
                    name: 'Kandy Temple',
                    desc: 'Sacred Temple of the Tooth Relic, surrounded by misty hills and the scenic Kandy Lake.',
                    tag: 'Culture',
                    rating: '4.6',
                    img: '/travel_bucket/sigiriya_lion_rock_1780037149392.png'
                  },
                  {
                    name: 'Mirissa Beach',
                    desc: 'Golden sands and palm-fringed bays, famous for whale watching and vibrant sunset surfing.',
                    tag: 'Relaxation',
                    rating: '4.7',
                    img: '/travel_bucket/galle_dutch_fort_1780037451501.png'
                  }
                ].map((item, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.05 }} 
                    className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between group relative"
                  >
                    <div className="w-full h-72 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-8 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-center mb-6">
                          <span className="px-3.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">{item.tag}</span>
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-black">
                            <Star size={12} fill="currentColor" /> {item.rating}
                          </div>
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 mt-4 mb-2 group-hover:text-orange-500 transition-colors">{item.name}</h4>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">{item.desc}</p>
                      </div>
                      <button onClick={onGoToPlanner} className="w-full py-4 bg-orange-500 text-white hover:bg-black hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-orange-600">
                        Create Trip <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Payments</h2>
                <p className="text-slate-500 font-bold mt-2">Manage your cards and review your transaction billing logs.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visa card mock */}
                <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 rounded-[3rem] text-white flex flex-col justify-between h-64 shadow-xl shadow-slate-900/10 border border-slate-800 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.15),transparent_60%)]"></div>
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Primary Card</p>
                      <h4 className="text-lg font-black tracking-tight mt-1">Smart Tour Pay</h4>
                    </div>
                    <span className="text-xs font-black text-slate-400 italic">VISA</span>
                  </div>
                  
                  <div className="my-auto z-10">
                    <p className="text-xl font-mono tracking-[0.2em] font-medium">•••• •••• •••• 4567</p>
                  </div>

                  <div className="flex justify-between items-end z-10">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Card Holder</p>
                      <p className="text-xs font-black uppercase tracking-tight mt-0.5">{userName || 'Active Explorer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Expires</p>
                      <p className="text-xs font-black mt-0.5">09/29</p>
                    </div>
                  </div>
                </div>

                {/* Account Plan Info */}
                <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="px-3.5 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-full">Standard Tier</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-4 mb-2">Ceylon Explorer</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">No active subscription plan. You are billed per trip based on driver estimates.</p>
                  </div>
                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Upgrade plan today</p>
                    <button className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-1 hover:text-orange-500 transition-colors">
                      Plans <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Spending summary */}
                <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="px-3.5 py-1 bg-blue-50 text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-full">Total Billings</span>
                    <h3 className="text-3xl font-black text-slate-900 mt-4 mb-2">Rs. {stats.totalSpent.toLocaleString()}</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">Accumulated expenditure across all planned, completed and ongoing expeditions.</p>
                  </div>
                  <div className="pt-6 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trips Booked: {stats.totalTrips}</p>
                  </div>
                </div>
              </div>

              {/* Transaction List */}
              <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm p-10 overflow-hidden">
                <h3 className="text-lg font-black text-slate-900 mb-8">Billing Logs</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Expedition ID</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Distance</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Fare Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tours.map((tour) => (
                        <tr key={tour.id} className="group">
                          <td className="py-4.5 text-sm font-black text-slate-900">#EXP-{tour.id}</td>
                          <td className="py-4.5 text-sm font-medium text-slate-500">{tour.start_date || 'Planned'}</td>
                          <td className="py-4.5 text-sm font-bold text-slate-700">{tour.total_distance_km} km</td>
                          <td className="py-4.5">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              tour.status === 'completed' ? 'bg-blue-50 text-green-700' :
                              tour.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {tour.status}
                            </span>
                          </td>
                          <td className="py-4.5 text-sm font-black text-slate-900 text-right">
                            Rs. {Number(tour.driver_price || tour.estimated_price).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {tours.length === 0 && (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                            No billing transactions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-12">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Account Settings</h2>
                <p className="text-slate-500 font-bold mt-2">Manage your personal details and system preference controls.</p>
              </div>

              {settingsSaved && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-bold">Profile updates saved successfully!</span>
                </motion.div>
              )}

              <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm p-10 space-y-8">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-4">
                  <User size={18} className="text-orange-500" /> Personal Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-950 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                    <input 
                      type="email" 
                      value={token ? JSON.parse(atob(token.split('.')[1])).sub || 'user@gmail.com' : 'user@gmail.com'} 
                      disabled
                      className="w-full bg-slate-50/50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                    <input 
                      type="text" 
                      value={settingsPhone}
                      onChange={(e) => setSettingsPhone(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-950 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Home Country / Origin</label>
                    <input 
                      type="text" 
                      value={settingsCountry}
                      onChange={(e) => setSettingsCountry(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-950 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm p-10 space-y-8">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-4">
                  <Bell size={18} className="text-orange-500" /> Notifications Settings
                </h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Email Notifications</h4>
                      <p className="text-slate-500 text-xs font-medium">Receive weekly travel reports, trip receipts, and recommendations.</p>
                    </div>
                    <button 
                      onClick={() => setEmailNotifs(!emailNotifs)}
                      className={`w-14 h-8 rounded-full transition-all duration-300 relative p-1 ${
                        emailNotifs ? 'bg-orange-500' : 'bg-slate-200'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-full bg-white transition-all shadow-sm ${
                        emailNotifs ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">SMS Driver Alerts</h4>
                      <p className="text-slate-500 text-xs font-medium">Receive instant mobile text alerts when a driver accepts your trip bids.</p>
                    </div>
                    <button 
                      onClick={() => setSmsNotifs(!smsNotifs)}
                      className={`w-14 h-8 rounded-full transition-all duration-300 relative p-1 ${
                        smsNotifs ? 'bg-orange-500' : 'bg-slate-200'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-full bg-white transition-all shadow-sm ${
                        smsNotifs ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button className="px-8 py-4 bg-slate-50 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200">
                  Cancel Changes
                </button>
                <button 
                  onClick={() => {
                    setSettingsSaved(true);
                    setTimeout(() => setSettingsSaved(false), 4000);
                  }}
                  className="px-10 py-4 bg-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-blue-600/20"
                >
                  Save Profile Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'trips' && (
             <div className="space-y-12">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight">Your Journeys</h2>
                   <p className="text-slate-500 font-bold mt-2">View active tour tracking and review past travel history logs.</p>
                 </div>
                 <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                   <button 
                     onClick={() => setActiveSubTab('active')}
                     className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                       activeSubTab === 'active' 
                       ? 'bg-white text-slate-900 shadow-sm' 
                       : 'text-slate-400 hover:text-slate-900'
                     }`}
                   >
                     Active ({upcomingTours.length})
                   </button>
                   <button 
                     onClick={() => setActiveSubTab('past')}
                     className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                       activeSubTab === 'past' 
                       ? 'bg-white text-slate-900 shadow-sm' 
                       : 'text-slate-400 hover:text-slate-900'
                     }`}
                   >
                     Past ({pastTours.length})
                   </button>
                 </div>
               </div>

               {activeSubTab === 'active' ? (
                 upcomingTours.length === 0 ? (
                   <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
                     <Compass className="text-orange-500 mx-auto mb-6" size={48} />
                     <h4 className="text-xl font-black text-slate-900 mb-2">No active journeys found</h4>
                     <p className="text-slate-500 text-sm font-bold max-w-sm mx-auto mb-8">Ready to explore Sri Lanka? Start planning your custom itinerary route now.</p>
                     <button onClick={onGoToPlanner} className="bg-slate-900 text-white px-10 py-4.5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-md">
                       Discover Destinations
                     </button>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {upcomingTours.map((tour, idx) => {
                       const canTrack = canUserStartLiveTracking(tour)
                       const awaitingSchedule = isUserAwaitingScheduleStart(tour)
                       const isLive = canTrack
                       return (
                         <motion.div key={tour.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-6">
                                 <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Navigation size={28} className={isLive ? 'animate-pulse' : ''} />
                                 </div>
                                 <span className="px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700">
                                    {tour.status.replace(/_/g, ' ')}
                                 </span>
                              </div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tour.start_date || 'Date Pending'}</p>
                              <h4 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-orange-500 transition-colors">{tour.total_distance_km} km Journey</h4>
                              {awaitingSchedule && (
                                <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 inline-flex items-center gap-1.5 mb-4">
                                  <Calendar size={12} />
                                  Tracking from {formatTourSchedule(tour)}
                                </p>
                              )}
                            </div>
                            
                            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                               <div className="leading-none">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Est. Price</p>
                                  <p className="text-lg font-black text-slate-900">Rs. {Number(tour.driver_price || tour.estimated_price).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  {canTrack && (
                                    <button
                                      onClick={() => { setLiveTrackingTourId(tour.id); setLiveTrackingTour(tour); setLiveTrackingMode('full') }}
                                      className="text-[10px] font-black text-white bg-orange-500 hover:bg-orange-600 uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
                                    >
                                      Track Live
                                    </button>
                                  )}
                                  <button onClick={() => { setSelectedTourId(tour.id); setShowDetailsModal(true) }} className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                                     Details <ChevronRight size={14} />
                                  </button>
                                  {tour.status === 'planned' && (
                                    <button 
                                      onClick={() => { setTourIdToDelete(tour.id); setShowDeleteConfirmModal(true); }}
                                      className="h-10 w-10 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm"
                                      title="Delete planned trip"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                            </div>
                         </motion.div>
                       )
                     })}
                   </div>
                 )
               ) : (
                 pastTours.length === 0 ? (
                   <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
                     <CheckCircle2 className="text-slate-300 mx-auto mb-6" size={48} />
                     <h4 className="text-xl font-black text-slate-900 mb-2">No past expeditions found</h4>
                     <p className="text-slate-500 text-sm font-bold max-w-sm mx-auto">Your completed or cancelled journeys will appear here once archived.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {pastTours.map((tour, idx) => (
                       <motion.div key={tour.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between relative overflow-hidden">
                          <div>
                            <div className="flex justify-between items-start mb-6">
                               <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                                 tour.status === 'completed' ? 'bg-blue-50 text-orange-500' : 'bg-rose-50 text-rose-600'
                               }`}>
                                  {tour.status === 'completed' ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                               </div>
                               <span className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                 tour.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                               }`}>
                                  {tour.status}
                               </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tour.start_date}</p>
                            <h4 className="text-2xl font-black text-slate-900 mb-6 group-hover:text-orange-500 transition-colors">{tour.total_distance_km} km Journey</h4>
                          </div>

                          <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                             <div className="leading-none">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Fare Paid</p>
                                <p className="text-lg font-black text-slate-900">Rs. {Number(tour.driver_price || tour.estimated_price).toLocaleString()}</p>
                             </div>
                             
                             <div className="flex items-center gap-4">
                               <button 
                                 onClick={() => { setSelectedTourId(tour.id); setShowDetailsModal(true) }}
                                 className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-orange-500 transition-colors flex items-center gap-0.5"
                               >
                                 Details <ChevronRight size={12} />
                               </button>
                               <button 
                                 onClick={() => { setTourIdToDelete(tour.id); setShowDeleteConfirmModal(true); }}
                                 className="h-10 w-10 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm"
                                 title="Delete trip history"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                          </div>
                       </motion.div>
                     ))}
                   </div>
                 )
               )}
             </div>
          )}
        </div>
        <Footer variant="dashboard" portal="customer" />
      </main>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-72 bg-white flex flex-col h-full relative z-10 p-8 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Compass className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight leading-none text-slate-900">SMART<span className="text-orange-500">TOUR</span></h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Tourism Dashboard</p>
                  </div>
                </div>
                <button onClick={() => setIsMobileSidebarOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                  <XCircle size={20} />
                </button>
              </div>

              <nav className="space-y-1.5">
                {[
                  { icon: LayoutDashboard, label: 'Overview', id: 'overview' },
                  { icon: MapIcon, label: 'My Trips', id: 'trips' },
                  { icon: Bell, label: 'Notifications', id: 'notifications' },
                  { icon: Star, label: 'Travel Bucket', id: 'saved' },
                  { icon: CreditCard, label: 'Payments', id: 'payments' },
                  { icon: Settings, label: 'Account', id: 'settings' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      setIsMobileSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                      activeTab === item.id 
                      ? 'bg-orange-500 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-orange-500'
                    }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-8">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-bold text-sm"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── Live Tracking & Modals ── */}
      {liveTrackingMode === 'panel' && liveTrackingTourId && canUserStartLiveTracking(liveTrackingTour) && (
        <LiveTrackingPanel
          tourId={liveTrackingTourId} token={token} userLat={liveTrackingTour?.pickup_lat} userLng={liveTrackingTour?.pickup_lng}
          driverName={liveTrackingTour?.driver_name} driverImg={liveTrackingTour?.driver_image} vehicleImg={liveTrackingTour?.vehicle_image} vehicleNumber={liveTrackingTour?.vehicle_number}
          onExpandToFull={() => setLiveTrackingMode('full')} onCancel={() => setShowCancelModal(true)}
        />
      )}

      <AnimatePresence>
        {showCancelModal && (
          <CancellationModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={handleCancelConfirm} loading={cancelling} />
        )}
      </AnimatePresence>

      {/* ── Price Negotiation Interruption Modal ── */}
      <AnimatePresence>
        {negotiationTours.length > 0 && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            {/* Iterating over all offers – show one at a time (first) */}
            {(() => {
              const tour = negotiationTours[0]
              const driverImg = getDriverImageUrl(tour.driver_image)
              const savings = tour.estimated_price - (tour.driver_price || 0)

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 30 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 250 }}
                  className="relative z-10 w-full max-w-lg"
                >
                  {/* Glow ring */}
                  <div className="absolute -inset-1 rounded-[3.5rem] bg-gradient-to-br from-orange-400 via-amber-300 to-orange-500 opacity-60 blur-xl animate-pulse pointer-events-none" />

                  <div className="relative bg-white rounded-[3rem] overflow-hidden shadow-2xl">

                    {/* Top banner */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-8 pt-8 pb-6 text-white text-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-2 right-4 text-[120px] font-black leading-none select-none">₹</div>
                      </div>
                      {/* Pulsing alert badge */}
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-100">Price Negotiation Alert</span>
                      </div>

                      {/* Driver Avatar */}
                      <div className="relative inline-block mb-4">
                        {driverImg ? (
                          <img
                            src={driverImg}
                            alt={tour.driver_name}
                            className="h-24 w-24 rounded-2xl object-cover border-4 border-white/30 shadow-xl mx-auto"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: driverImg ? 'none' : 'flex' }}
                          className="h-24 w-24 rounded-2xl bg-white/20 text-white text-4xl font-black border-4 border-white/30 shadow-xl mx-auto items-center justify-center"
                        >
                          {tour.driver_name?.[0]?.toUpperCase() || 'D'}
                        </div>
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow">
                          Approved Driver
                        </span>
                      </div>

                      <h3 className="text-xl font-black mt-3 tracking-tight">
                        {tour.driver_name || 'Your Driver'} sent a fare offer
                      </h3>
                      <p className="text-orange-100 text-sm font-medium mt-1">
                        {tour.total_distance_km} km &bull; {tour.total_days} day{tour.total_days !== 1 ? 's' : ''}
                        {tour.vehicle_number ? ` · ${tour.vehicle_number}` : ''}
                      </p>
                    </div>

                    {/* Price Comparison */}
                    <div className="px-8 py-6 bg-slate-50 flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Estimate</p>
                        <p className="text-2xl font-black text-slate-400 line-through">
                          Rs. {(tour.estimated_price || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="h-px w-12 bg-slate-300" />
                        <span className="text-[9px] text-slate-400 font-black uppercase my-1">vs</span>
                        <div className="h-px w-12 bg-slate-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Driver's Offer</p>
                        <p className="text-3xl font-black text-slate-900">
                          Rs. {(tour.driver_price || 0).toLocaleString()}
                        </p>
                        {savings !== 0 && (
                          <p className={`text-[10px] font-black mt-1 ${savings > 0 ? 'text-orange-500' : 'text-rose-500'}`}>
                            {savings > 0 ? `Rs. ${savings.toLocaleString()} less than estimate` : `Rs. ${Math.abs(savings).toLocaleString()} above estimate`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reply / Counter area */}
                    <div className="px-8 py-5 border-t border-slate-100">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Send a counter message (optional)
                      </label>
                      <textarea
                        rows={2}
                        value={negotiationReply}
                        onChange={(e) => setNegotiationReply(e.target.value)}
                        placeholder="e.g. Can you do Rs. 18,000?"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/30 placeholder:text-slate-400 transition-all"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="px-8 pb-8 space-y-3">
                      {/* Send reply if typed */}
                      {negotiationReply.trim() && (
                        <button
                          onClick={() => handleSendReply(tour.id)}
                          disabled={negotiationLoading}
                          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                          <MessageSquare size={15} />
                          Send Counter Message
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleAcceptOffer(tour.id)}
                          disabled={negotiationLoading}
                          className="py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/25 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={15} />
                          {negotiationLoading ? 'Please wait…' : 'Accept Offer'}
                        </button>
                        <button
                          onClick={() => handleRejectOffer(tour.id)}
                          disabled={negotiationLoading}
                          className="py-4 bg-white border-2 border-rose-200 hover:bg-rose-600 hover:border-rose-600 text-rose-600 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                          <XCircle size={15} />
                          Reject
                        </button>
                      </div>

                      {negotiationTours.length > 1 && (
                        <p className="text-center text-[10px] text-slate-400 font-bold pt-1">
                          +{negotiationTours.length - 1} more driver offer{negotiationTours.length - 1 !== 1 ? 's' : ''} waiting
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })()}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirmModal(false)}
            />
            {/* Content */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full relative z-10 border border-slate-100 shadow-2xl text-center"
            >
              <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Journey History?</h3>
              <p className="text-slate-500 font-bold mb-8 text-sm leading-relaxed">
                Are you sure you want to delete this trip record? This will permanently remove the journey details and history. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TourDetailsModal tourId={selectedTourId} token={token} isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} userRole="user" />

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        
        body {
          scrollbar-width: none;
          -ms-overflow-style: none;
          background: #ffffff;
        }
        
        body::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }

        .animate-pulse-ring {
          animation: pulse-ring 3s infinite ease-in-out;
        }

        ::selection {
          background: #bbf7d0;
          color: #166534;
        }
      `}} />
    </div>
  )
}
