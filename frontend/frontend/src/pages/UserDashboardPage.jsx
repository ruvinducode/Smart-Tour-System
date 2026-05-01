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
  Menu
} from 'lucide-react'
import { getUserNotifications, getUserTours, cancelTour } from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'
import LiveTrackingPage from './LiveTrackingPage.jsx'
import LiveTrackingPanel from '../components/LiveTrackingPanel.jsx'
import CancellationModal from '../components/CancellationModal.jsx'

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

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [tourData, notifData] = await Promise.all([
        getUserTours(token),
        getUserNotifications(token)
      ])
      const toursArr = Array.isArray(tourData) ? tourData : []
      setTours(toursArr)
      setNotifications(Array.isArray(notifData) ? notifData : [])

      const activeStatuses = ['driver_approved', 'confirmed', 'en_route', 'arrived', 'ongoing']
      const activeTour = toursArr.find(t => activeStatuses.includes(t.status))
      
      if (activeTour && !liveTrackingTourId) {
        setLiveTrackingTourId(activeTour.id)
        setLiveTrackingTour(activeTour)
        setLiveTrackingMode('panel')
      }

      if (liveTrackingTourId) {
        const trackedTour = toursArr.find(t => t.id === liveTrackingTourId)
        if (trackedTour && (trackedTour.status === 'completed' || trackedTour.status === 'cancelled')) {
          setLiveTrackingMode('full')
          setLiveTrackingTour(trackedTour)
        } else if (trackedTour) {
          setLiveTrackingTour(trackedTour)
        }
      }
    } catch (err) {
      console.error('Dashboard load failed', err)
      if (err.message?.toLowerCase().includes('token has expired') || err.message?.includes('401')) {
        onLogout()
      }
    } finally {
      setLoading(false)
    }
  }, [token, onLogout, liveTrackingTourId])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  useEffect(() => {
    const id = setInterval(loadDashboardData, 15000)
    return () => clearInterval(id)
  }, [loadDashboardData])

  const upcomingTours = useMemo(() => 
    tours.filter(t => t.status !== 'completed' && t.status !== 'cancelled'), 
    [tours]
  )

  const pastTours = useMemo(() => 
    tours.filter(t => t.status === 'completed' || t.status === 'cancelled'), 
    [tours]
  )

  const stats = useMemo(() => ({
    totalTrips: tours.length,
    completedTrips: tours.filter(t => t.status === 'completed').length,
    totalSpent: tours.reduce((sum, t) => sum + (Number(t.driver_price || t.estimated_price) || 0), 0),
    totalDistance: tours.reduce((sum, t) => sum + (Number(t.total_distance_km) || 0), 0),
  }), [tours])

  if (liveTrackingMode === 'full' && liveTrackingTourId) {
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
      setLiveTrackingMode(null)
      setLiveTrackingTourId(null)
      loadDashboardData()
    } catch (err) {
      alert(err.message || 'Failed to cancel tour')
    } finally {
      setCancelling(false)
    }
  }

  const SidebarItem = ({ icon: Icon, label, id, active }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
        active 
        ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-green-600'
      }`}
    >
      <Icon size={18} className={active ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
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
    <div className="flex min-h-screen bg-white font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-100 flex-col fixed h-screen overflow-y-auto scrollbar-hide z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center shadow-lg shadow-green-600/20">
              <Compass className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-slate-900">SMART<span className="text-orange-500">TOUR</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Tourism Dashboard</p>
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
      <main className="flex-1 lg:ml-72 min-h-screen pb-20">
        {/* ── Top Header ── */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-50 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="lg:hidden p-2 text-slate-600">
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search your journeys..." 
                className="bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-3 text-sm font-medium w-80 focus:ring-2 focus:ring-green-500/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="h-9 w-9 rounded-xl bg-green-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-green-600/20">
                 {userName?.[0] || 'U'}
               </div>
               <div className="leading-tight">
                 <p className="text-xs font-black text-slate-900">{userName || 'Explorer'}</p>
                 <p className="text-[10px] font-bold text-orange-500 mt-0.5 tracking-tight">Active Traveler</p>
               </div>
            </div>
            <button 
              onClick={() => setActiveTab('notifications')}
              className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-green-100 transition-all relative group"
            >
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              {notifications.length > 0 && (
                <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </header>

        <div className="p-8 md:p-12 max-w-7xl mx-auto">
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
                    className="bg-green-600 text-white px-8 py-4 rounded-[2rem] font-black text-sm flex items-center gap-3 hover:bg-green-700 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-green-600/30"
                  >
                    <Plus size={20} />
                    PLAN NEW TRIP
                  </button>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Trips', value: stats.totalTrips, icon: MapIcon, color: 'green' },
                  { label: 'Distance', value: `${stats.totalDistance} km`, icon: Navigation, color: 'orange' },
                  { label: 'Spending', value: `Rs. ${stats.totalSpent.toLocaleString()}`, icon: CreditCard, color: 'green' },
                  { label: 'Rewards', value: '450 pts', icon: Star, color: 'orange' },
                ].map((stat, i) => (
                  <motion.div key={i} variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(34,197,94,0.08)] transition-all group">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                      stat.color === 'green' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                    }`}>
                      <stat.icon size={28} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  </motion.div>
                ))}
              </motion.div>

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
                          <Compass className="text-green-600" size={48} />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 mb-3">No active trips</h4>
                        <p className="text-slate-500 max-w-sm mx-auto mb-10 font-bold leading-relaxed">Ready for a new adventure? Explore Sri Lanka's hidden gems now.</p>
                        <button onClick={onGoToPlanner} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl active:scale-95">
                          Discover Destinations
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {upcomingTours.map((tour, idx) => {
                          const isLive = ['en_route', 'arrived', 'ongoing', 'confirmed', 'driver_approved'].includes(tour.status)
                          return (
                            <motion.div
                              key={tour.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className={`bg-white rounded-[3rem] border transition-all duration-500 p-8 relative overflow-hidden ${
                                isLive ? 'border-green-200 shadow-[0_20px_60px_rgba(34,197,94,0.1)]' : 'border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)]'
                              }`}
                            >
                              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-green-600">
                                <MapIcon size={240} />
                              </div>

                              <div className="relative z-10">
                                <div className="flex flex-wrap justify-between items-start gap-8 mb-10">
                                  <div className="flex items-center gap-6">
                                    <div className={`h-20 w-20 rounded-[2rem] flex items-center justify-center shadow-lg ${
                                      isLive ? 'bg-green-600 text-white shadow-green-600/20' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                      <Navigation size={40} className={isLive ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Expedition #{tour.id}</span>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                          tour.status === 'ongoing' ? 'bg-green-500 text-white' :
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
                                  {isLive ? (
                                    <button onClick={() => { setLiveTrackingTourId(tour.id); setLiveTrackingTour(tour); setLiveTrackingMode('full') }} className="flex-[1.5] py-5 bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-3">
                                      <Navigation size={18} />
                                      Track Live Journey
                                    </button>
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
                              <span className="text-green-400">45% Completed</span>
                            </div>
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                              <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} transition={{ duration: 1.5 }} className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-green-500 blur-[80px] opacity-20"></div>
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
                        { label: 'New Stop', icon: MapPin, color: 'green' },
                        { label: 'Inbox', icon: MessageSquare, color: 'orange' },
                        { label: 'Billing', icon: CreditCard, color: 'green' },
                        { label: 'Help', icon: AlertCircle, color: 'orange' },
                      ].map((action, i) => (
                        <button key={i} className="flex flex-col items-center gap-4 p-6 rounded-3xl hover:bg-slate-50 transition-all group">
                          <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all group-hover:scale-110 shadow-sm ${
                            action.color === 'green' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                            <action.icon size={28} />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-black text-slate-900">Activity</h3>
                      {notifications.length > 0 && <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full uppercase tracking-tighter">{notifications.length} New</span>}
                    </div>
                    
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                      {notifications.length === 0 ? (
                        <div className="py-16 text-center">
                          <Bell className="text-slate-200 mx-auto mb-6" size={48} />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No recent alerts</p>
                        </div>
                      ) : (
                        notifications.map((note, idx) => {
                          const isNew = idx < 2;
                          return (
                            <motion.div 
                              key={note.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                              className={`group p-6 rounded-[2rem] border transition-all hover:bg-slate-50 ${
                                isNew ? 'bg-green-50/30 border-green-100' : 'bg-white border-slate-50'
                              }`}
                            >
                              <div className="flex gap-5">
                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                  isNew ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  <Bell size={20} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 mb-1.5 leading-tight">{note.subject}</p>
                                  <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2 mb-4 font-medium">{note.message}</p>
                                  <button
                                    onClick={() => {
                                      const match = note.message?.match(/#(\d+)/) || note.subject?.match(/#(\d+)/);
                                      if (match) { setSelectedTourId(match[1]); setShowDetailsModal(true); }
                                      else { setActiveTab('trips'); }
                                    }}
                                    className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] hover:text-orange-600 transition-colors flex items-center gap-1"
                                  >
                                    View Journey <ChevronRight size={12} />
                                  </button>
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

          {activeTab === 'notifications' && (
            <div className="max-w-3xl mx-auto space-y-8">
               <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-12">Notifications</h2>
               {notifications.map((note, idx) => (
                 <motion.div key={note.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                       <Bell size={24} />
                    </div>
                    <div>
                       <h4 className="text-xl font-black text-slate-900 mb-2">{note.subject}</h4>
                       <p className="text-slate-500 font-bold mb-6 leading-relaxed">{note.message}</p>
                       <button onClick={() => {
                         const match = note.message?.match(/#(\d+)/) || note.subject?.match(/#(\d+)/);
                         if (match) { setSelectedTourId(match[1]); setShowDetailsModal(true); }
                       }} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg shadow-green-600/20">
                         Review Details
                       </button>
                    </div>
                 </motion.div>
               ))}
               {notifications.length === 0 && <div className="text-center py-20 text-slate-400 font-black uppercase tracking-widest">No notifications to display.</div>}
            </div>
          )}

          {activeTab === 'trips' && (
             <div className="space-y-12">
               <h2 className="text-4xl font-black text-slate-900 tracking-tight">Your Journeys</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {tours.map((tour, idx) => (
                    <motion.div key={tour.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                       <div className="flex justify-between items-start mb-6">
                          <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center ${tour.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                             {tour.status === 'completed' ? <CheckCircle2 size={32} /> : <MapPin size={32} />}
                          </div>
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${tour.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                             {tour.status}
                          </span>
                       </div>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{tour.start_date}</p>
                       <h4 className="text-2xl font-black text-slate-900 mb-6 group-hover:text-green-600 transition-colors">{tour.total_distance_km} km Expedition</h4>
                       <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                          <p className="text-lg font-black text-slate-900">Rs. {Number(tour.driver_price || tour.estimated_price).toLocaleString()}</p>
                          <button onClick={() => { setSelectedTourId(tour.id); setShowDetailsModal(true) }} className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                             Details <ChevronRight size={14} />
                          </button>
                       </div>
                    </motion.div>
                  ))}
               </div>
             </div>
          )}
        </div>
      </main>

      {/* ── Live Tracking & Modals ── */}
      {liveTrackingMode === 'panel' && liveTrackingTourId && (
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
