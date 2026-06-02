import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveDriverTourRequest,
  getDriverTourRequests,
  sendDriverNegotiatedPrice,
  getDriverProfile,
  updateDriverProfile,
  getDriverNotifications,
  markTourEnRoute,
  getApiBaseUrl
} from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'
import ConfirmationModal from '../components/ConfirmationModal.jsx'
import DashboardChart from '../components/DashboardChart.jsx'
import Footer from '../components/Footer.jsx'
import LiveHireDriver from './LiveHireDriver.jsx'
import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

const driverChartData = [
  { name: 'Mon', trips: 4, earnings: 1500 },
  { name: 'Tue', trips: 6, earnings: 2200 },
  { name: 'Wed', trips: 5, earnings: 1800 },
  { name: 'Thu', trips: 7, earnings: 2800 },
  { name: 'Fri', trips: 9, earnings: 3500 },
  { name: 'Sat', trips: 12, earnings: 5000 },
  { name: 'Sun', trips: 10, earnings: 4200 },
];

const statusConfig = {
  planned:               { label: 'Pending',        bg: 'bg-amber-100',   text: 'text-amber-800'  },
  driver_approved:       { label: 'Approved',       bg: 'bg-emerald-100', text: 'text-emerald-800'},
  price_sent_by_driver:  { label: 'Price Sent',     bg: 'bg-blue-100',    text: 'text-blue-800'   },
  confirmed:             { label: 'Confirmed',      bg: 'bg-indigo-100',  text: 'text-indigo-800' },
  en_route:              { label: 'En Route',       bg: 'bg-blue-100',    text: 'text-blue-800'   },
  arrived:               { label: 'Arrived',        bg: 'bg-emerald-100', text: 'text-emerald-800'},
  ongoing:               { label: 'Ongoing',        bg: 'bg-orange-100',  text: 'text-orange-800' },
  rejected:              { label: 'Rejected',       bg: 'bg-rose-100',    text: 'text-rose-700'   },
  completed:             { label: 'Completed',      bg: 'bg-teal-100',    text: 'text-teal-800'   },
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

const NAV_ITEMS = [
  { id: 'all',         label: 'Dashboard',   icon: 'bi bi-grid-fill' },
  { id: 'upcoming',    label: 'Upcoming',    icon: 'bi bi-calendar-event-fill' },
  { id: 'approved',    label: 'Approved',    icon: 'bi bi-check-circle-fill' },
  { id: 'price_sent',  label: 'Negotiating', icon: 'bi bi-arrow-left-right' },
  { id: 'profile',     label: 'My Profile',  icon: 'bi bi-person-circle' },
]

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

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getDriverProfile(token)
      setProfileData(data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
  }, [token])

  const loadTourRequests = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [tourData, notifData] = await Promise.all([
        getDriverTourRequests(token),
        getDriverNotifications(token)
      ])
      setTourRequests(Array.isArray(tourData) ? tourData : [])
      setNotifications(Array.isArray(notifData) ? notifData : [])
    } catch (err) {
      setError(err.message || 'Could not load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { 
    loadTourRequests()
    fetchProfile() 
  }, [loadTourRequests, fetchProfile])

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
      return tourRequests.filter(t => t.status === 'confirmed')
    }
    if (activeTab === 'price_sent') return tourRequests.filter(t => t.status === 'price_sent_by_driver')
    return tourRequests
  }, [activeTab, tourRequests])

  const total      = tourRequests.length
  const approved   = tourRequests.filter(t => ['driver_approved', 'confirmed', 'en_route', 'arrived', 'ongoing'].includes(t.status)).length
  const priceSent  = tourRequests.filter(t => t.status === 'price_sent_by_driver').length
  const totalKm    = tourRequests.reduce((s, t) => s + (t.total_distance_km || 0), 0)

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
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className={`flex flex-col justify-between bg-slate-900 border-r border-slate-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} min-h-screen`}>
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
                {sidebarOpen && <span>{item.label}</span>}
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

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between bg-white px-8 py-5 shadow-sm border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">
            {activeTab === 'all' ? 'All Requests' : 
             activeTab === 'approved' ? 'Approved Tours' : 
             activeTab === 'upcoming' ? 'Upcoming Tours' : 
             activeTab === 'profile' ? 'My Profile' : 'Negotiations'}
          </h1>
          <div className="flex items-center gap-6">
            <button onClick={loadTourRequests} disabled={loading} className="flex items-center gap-2 text-slate-600 hover:text-orange-500 text-sm font-bold transition-colors">
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
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce-subtle">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Notifications</h4>
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{notifications.length} Total</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <i className="bi bi-bell-slash text-3xl text-slate-200 mb-3 block"></i>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No notifications</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-5 hover:bg-slate-50 transition-colors group">
                          <div className="flex gap-4">
                            <div className={`h-10 w-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg ${
                              n.subject.toLowerCase().includes('cancelled') ? 'bg-rose-50 text-rose-500' : 'bg-orange-50 text-orange-500'
                            }`}>
                              <i className={`bi ${n.subject.toLowerCase().includes('cancelled') ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}`}></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-slate-900 leading-tight mb-1">{n.subject}</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.message}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-2">
                                {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 font-bold flex items-center gap-3"><i className="bi bi-exclamation-triangle-fill"></i> {error}</div>}
          {info && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-700 font-bold flex items-center gap-3"><i className="bi bi-check-circle-fill"></i> {info}</div>}

          {activeTab !== 'profile' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Requests', value: total,     icon: 'bi-clipboard-data', text: 'text-blue-600' },
                  { label: 'Approved',       value: approved,  icon: 'bi-check-circle',   text: 'text-emerald-600' },
                  { label: 'Negotiating',    value: priceSent, icon: 'bi-chat-dots',      text: 'text-amber-600'  },
                  { label: 'Total Distance', value: `${totalKm.toFixed(0)} km`, icon: 'bi-map', text: 'text-violet-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm group hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl bg-slate-50 ${s.text} group-hover:scale-110 transition-transform`}><i className={`bi ${s.icon}`}></i></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{s.value}</p>
                  </div>
                ))}
              </div>

              {activeTab !== 'upcoming' && (
                <DashboardChart 
                  data={driverChartData} 
                  title="Weekly Earnings & Trips" 
                  barKey="trips" 
                  lineKey="earnings" 
                />
              )}

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-900">Recent Tour Requests</h2>
                    <button 
                      onClick={() => setActiveTab('upcoming')}
                      className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full hover:bg-orange-100 transition-all uppercase tracking-widest border border-orange-200"
                    >
                      View Upcoming →
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                    <span className="text-sm font-bold text-slate-500">{filteredTours.length} Available</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {loading && <div className="py-20 text-center"><div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500 mb-4" /><p className="text-slate-500 font-bold">Fetching latest requests...</p></div>}
                  {!loading && filteredTours.length === 0 && <div className="py-20 text-center px-8"><div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><i className="bi bi-clipboard-x text-3xl text-slate-300"></i></div><p className="text-slate-500 font-bold">No requests found.</p></div>}
                  {!loading && filteredTours.map((tour) => (
                    <div key={tour.id} className="p-8 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest">Tour #{tour.id}</span>
                            <StatusBadge status={tour.status} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passenger</p>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">{(tour.user_name || 'U').charAt(0).toUpperCase()}</div>
                                <div><p className="text-base font-bold text-slate-800 leading-tight">{tour.user_name || 'Anonymous'}</p><p className="text-xs text-slate-400 font-medium">{tour.user_email || 'No email'}</p></div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Route & Distance</p>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2"><i className="bi bi-geo-alt text-orange-500 font-bold"></i><span className="text-base font-bold text-slate-800">{tour.total_distance_km || 0} km</span></div>
                                <div className="flex items-center gap-2"><i className="bi bi-clock text-blue-500 font-bold"></i><span className="text-base font-bold text-slate-800">{tour.total_days || 0} day(s)</span></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl">
                              <i className="bi bi-calendar-event"></i><span>{tour.start_date || 'N/A'}{tour.start_time ? ` @ ${tour.start_time}` : ''}</span><i className="bi bi-arrow-right mx-1 opacity-40"></i><span>{tour.end_date || 'N/A'}</span>
                            </div>
                            <div className="text-lg font-black text-slate-900"><span className="text-sm font-bold text-slate-400 mr-1">Estimated:</span>Rs. {Number(tour.estimated_price || 0).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="lg:w-72 space-y-3">
                          <button onClick={() => { setSelectedTourId(tour.id); setShowDetailsModal(true) }} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-slate-200 px-6 py-3 text-sm font-black text-slate-700 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm"><i className="bi bi-map"></i> View Details</button>
                          { (tour.status === 'confirmed' || tour.status === 'driver_approved' || tour.status === 'en_route' || tour.status === 'arrived' || tour.status === 'ongoing') && (() => {
                            const localDate = new Date();
                            const year = localDate.getFullYear();
                            const month = String(localDate.getMonth() + 1).padStart(2, '0');
                            const day = String(localDate.getDate()).padStart(2, '0');
                            const hours = String(localDate.getHours()).padStart(2, '0');
                            const minutes = String(localDate.getMinutes()).padStart(2, '0');
                            
                            const todayStr = `${year}-${month}-${day}`;
                            const timeStr = `${hours}:${minutes}`;
                            
                            const isFutureDate = tour.start_date && todayStr < tour.start_date;
                            const isFutureTime = tour.start_date && tour.start_time && todayStr === tour.start_date && timeStr < tour.start_time;
                            const isFuture = isFutureDate || isFutureTime;
                            
                            const isStartAction = tour.status === 'confirmed' || tour.status === 'driver_approved';
                            
                            return (
                              <button 
                                disabled={isStartAction && isFuture}
                                onClick={async () => {
                                  try {
                                    if (tour.status === 'confirmed' || tour.status === 'driver_approved') {
                                      await markTourEnRoute(tour.id, token)
                                    }
                                    setActiveRideTourId(tour.id)
                                  } catch (err) {
                                    alert("Failed to start driving: " + err.message)
                                  }
                                }} 
                                className={`w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black transition-all ${
                                  (isStartAction && isFuture)
                                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30'
                                }`}
                              >
                                <i className={isStartAction && isFuture ? "bi bi-calendar-x" : "bi bi-cursor-fill"}></i> 
                                {isStartAction && isFuture 
                                  ? `Locked until ${tour.start_time ? tour.start_time : 'today'}`
                                  : isStartAction ? 'Start Driving' : 'Continue Driving'}
                              </button>
                            );
                          })()}
                          { (tour.status === 'planned' || tour.status === 'price_sent_by_driver') && (
                            <div className="space-y-3">
                              {tour.status !== 'price_sent_by_driver' && (
                                <button onClick={() => handleApprove(tour.id)} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20">✓ Accept Tour</button>
                              )}
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                                <input type="number" placeholder="Your Price" value={priceInputs[tour.id] || ''} onChange={(e) => setPriceInputs({ ...priceInputs, [tour.id]: e.target.value })} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 pl-10 pr-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition" />
                              </div>
                              <button onClick={() => handleSendPrice(tour.id)} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">{tour.status === 'price_sent_by_driver' ? 'Update Offer' : 'Send Counter-Offer'}</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'profile' && profileData && (
            <div className="max-w-5xl mx-auto animate-fade-in-up">
              <div className="flex items-center justify-between mb-8">
                <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Driver Profile</h2><p className="text-slate-500 font-medium mt-1">Manage your professional information</p></div>
                <button onClick={() => setEditMode(!editMode)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${editMode ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'}`}><i className={`bi ${editMode ? 'bi-x-lg' : 'bi-pencil-fill'}`}></i>{editMode ? 'Cancel Editing' : 'Edit Profile'}</button>
              </div>

              {!editMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
                      <div className="relative inline-block mb-6">
                        {profileData.profile_photo ? (
                          <img src={`http://127.0.0.1:5001/uploads/drivers/${profileData.profile_photo}`} alt="Profile" className="h-32 w-32 rounded-3xl object-cover shadow-xl border-4 border-white" />
                        ) : (
                          <div className="h-32 w-32 rounded-3xl bg-orange-100 flex items-center justify-center text-orange-600 text-4xl font-black shadow-inner">{profileData.full_name.charAt(0)}</div>
                        )}
                        <span className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center text-white text-xs"><i className="bi bi-patch-check-fill"></i></span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">{profileData.full_name}</h3>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">{profileData.vehicle_type} Specialist</p>
                      <div className="mt-8 pt-8 border-t border-slate-100 space-y-4 text-left">
                        <div className="flex items-center gap-3 text-sm"><i className="bi bi-envelope text-slate-400"></i><span className="font-medium text-slate-600">{profileData.email}</span></div>
                        <div className="flex items-center gap-3 text-sm"><i className="bi bi-telephone text-slate-400"></i><span className="font-medium text-slate-600">{profileData.phone}</span></div>
                        <div className="flex items-center gap-3 text-sm"><i className="bi bi-geo-alt text-slate-400"></i><span className="font-medium text-slate-600">{profileData.home_district}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Vehicle Specifications</h4><i className="bi bi-truck text-slate-400"></i></div>
                      <div className="p-8 grid grid-cols-2 gap-8">
                        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Brand & Model</p><p className="text-base font-black text-slate-800">{profileData.vehicle_brand || 'N/A'}</p></div>
                        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Plate Number</p><p className="text-base font-black text-slate-800">{profileData.vehicle_number || 'N/A'}</p></div>
                        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Color</p><p className="text-base font-black text-slate-800">{profileData.vehicle_color || 'N/A'}</p></div>
                        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Capacity</p><p className="text-base font-black text-slate-800">{profileData.capacity || 'N/A'} Seats</p></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">License Information</h4><i className="bi bi-card-checklist text-slate-400"></i></div>
                      <div className="p-8 grid grid-cols-2 gap-8">
                        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">License Number</p><p className="text-base font-black text-slate-800">{profileData.license_number || 'N/A'}</p></div>
                        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Expiry Date</p><p className="text-base font-black text-slate-800">{profileData.license_expiry_date || 'N/A'}</p></div>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Documents Preview</h4><i className="bi bi-file-earmark-medical text-slate-400"></i></div>
                      <div className="p-8 grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                          { label: 'License Front', img: profileData.license_front_image },
                          { label: 'License Back', img: profileData.license_back_image },
                          { label: 'Reg Book', img: profileData.vehicle_reg_book_image },
                          { label: 'Revenue License', img: profileData.revenue_license_image },
                          { label: 'Insurance Cert', img: profileData.insurance_cert_image },
                          { label: 'Vehicle Front', img: profileData.vehicle_front_image },
                          { label: 'Vehicle Rear', img: profileData.vehicle_rear_image },
                          { label: 'Vehicle Side', img: profileData.vehicle_side_image },
                        ].map(doc => (
                          <div key={doc.label} className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.label}</p>
                            {doc.img ? (
                              <img src={`${getApiBaseUrl()}/uploads/drivers/${doc.img}`} alt={doc.label} className="w-full h-32 rounded-2xl object-cover border-2 border-slate-100 shadow-sm hover:scale-105 transition cursor-zoom-in" />
                            ) : (
                              <div className="w-full h-32 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-100"><i className="bi bi-image text-xl"></i></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="p-8 space-y-10">
                    <div className="space-y-6">
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs border-b pb-2">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Full Name</label><input name="full_name" defaultValue={profileData.full_name} required className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-500 outline-none transition" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Phone</label><input name="phone" defaultValue={profileData.phone} required className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-500 outline-none transition" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">NIC Number</label><input name="nic_number" defaultValue={profileData.nic_number} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-500 outline-none transition" /></div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 ml-1">Gender</label>
                          <select name="gender" defaultValue={profileData.gender} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-500 outline-none transition">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Home District</label><input name="home_district" defaultValue={profileData.home_district} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-500 outline-none transition" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Profile Photo</label><input name="profile_photo" type="file" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-orange-50 file:text-orange-700" /></div>
                      </div>
                      <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Home Address</label><textarea name="home_address" defaultValue={profileData.home_address} rows={2} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-500 outline-none transition resize-none" /></div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs border-b pb-2">License & Documents</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">License Number</label><input name="license_number" defaultValue={profileData.license_number} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-emerald-500 outline-none transition" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Expiry Date</label><input name="license_expiry_date" type="date" defaultValue={profileData.license_expiry_date} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-emerald-500 outline-none transition" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                          { name: 'license_front_image', label: 'License Front', current: profileData.license_front_image },
                          { name: 'license_back_image', label: 'License Back', current: profileData.license_back_image },
                          { name: 'vehicle_reg_book_image', label: 'Reg Book', current: profileData.vehicle_reg_book_image },
                          { name: 'revenue_license_image', label: 'Revenue License', current: profileData.revenue_license_image },
                          { name: 'insurance_cert_image', label: 'Insurance Certificate', current: profileData.insurance_cert_image },
                          { name: 'vehicle_front_image', label: 'Vehicle Front', current: profileData.vehicle_front_image },
                          { name: 'vehicle_rear_image', label: 'Vehicle Rear', current: profileData.vehicle_rear_image },
                          { name: 'vehicle_side_image', label: 'Vehicle Side', current: profileData.vehicle_side_image },
                        ].map(doc => (
                          <div key={doc.name} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <label className="text-xs font-bold text-slate-600 ml-1">{doc.label}</label>
                            {doc.current && (
                              <div className="relative group">
                                <img src={`${getApiBaseUrl()}/uploads/drivers/${doc.current}`} alt="Current" className="w-full h-20 rounded-xl object-cover border border-slate-200 opacity-60 group-hover:opacity-100 transition" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                                  <span className="bg-slate-900/50 text-white text-[10px] font-black px-2 py-1 rounded-full">Current File</span>
                                </div>
                              </div>
                            )}
                            <input name={doc.name} type="file" className="w-full text-[10px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-orange-50 file:text-orange-600" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs border-b pb-2">Vehicle Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Type</label><input name="vehicle_type" defaultValue={profileData.vehicle_type} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-blue-500 outline-none transition" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Brand</label><input name="vehicle_brand" defaultValue={profileData.vehicle_brand} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-blue-500 outline-none transition" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Plate #</label><input name="vehicle_number" defaultValue={profileData.vehicle_number} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-blue-500 outline-none transition" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Color</label><input name="vehicle_color" defaultValue={profileData.vehicle_color} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-blue-500 outline-none transition" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 ml-1">Seats</label><input name="capacity" type="number" defaultValue={profileData.capacity} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-blue-500 outline-none transition" /></div>
                      </div>
                    </div>

                    <div className="pt-8 border-t flex justify-end gap-4"><button type="button" onClick={() => setEditMode(false)} className="px-8 py-3 rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-50 transition">Discard</button><button type="submit" disabled={updatingProfile} className="px-10 py-3 rounded-2xl bg-orange-500 text-white font-black text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-500/20">{updatingProfile ? 'Saving...' : 'Save Changes'}</button></div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
        <Footer minimal={true} />
      </main>

      <TourDetailsModal tourId={selectedTourId} token={token} isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} userRole="driver" />
      <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} type={confirmState.type} onConfirm={confirmState.onConfirm} onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} isLoading={confirmState.isLoading} />
    </div>
  )
}