import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveDriverTourRequest,
  getDriverTourRequests,
  sendDriverNegotiatedPrice,
} from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'
import LiveHireDriver from './LiveHireDriver.jsx' // <-- IMPORTED THE NEW LIVE MAP

const statusConfig = {
  planned:               { label: 'Pending',        bg: 'bg-amber-100',   text: 'text-amber-800'  },
  driver_approved:       { label: 'Approved',       bg: 'bg-emerald-100', text: 'text-emerald-800'},
  price_sent_by_driver:  { label: 'Price Sent',     bg: 'bg-blue-100',    text: 'text-blue-800'   },
  confirmed:             { label: 'Confirmed',      bg: 'bg-indigo-100',  text: 'text-indigo-800' },
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
  { id: 'approved',    label: 'Approved',    icon: 'bi bi-check-circle-fill' },
  { id: 'price_sent',  label: 'Negotiating', icon: 'bi bi-arrow-left-right' },
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
  
  // <-- NEW STATE: Tracks if driver is currently in the Live Navigation screen
  const [activeRideTourId, setActiveRideTourId] = useState(null)

  const loadTourRequests = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await getDriverTourRequests(token)
      setTourRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Could not load tour requests')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadTourRequests() }, [loadTourRequests])

  const handleApprove = async (tourId) => {
    setError(''); setInfo('')
    try {
      const data = await approveDriverTourRequest(tourId, token)
      setInfo(data.message || 'Tour approved')
      setActiveRideTourId(tourId) // Immediately start the driving section
      await loadTourRequests()
    } catch (err) { setError(err.message || 'Could not approve tour') }
  }

  const handleSendPrice = async (tourId) => {
    setError(''); setInfo('')
    const price = priceInputs[tourId]
    if (!price) { setError('Please enter a price first'); return }
    try {
      const data = await sendDriverNegotiatedPrice(tourId, Number(price), token)
      setInfo(data.message || 'Price sent to user')
      await loadTourRequests()
    } catch (err) { setError(err.message || 'Could not send price') }
  }

  const filteredTours = useMemo(() => {
    if (activeTab === 'approved')   return tourRequests.filter(t => t.status === 'driver_approved')
    if (activeTab === 'price_sent') return tourRequests.filter(t => t.status === 'price_sent_by_driver')
    return tourRequests
  }, [activeTab, tourRequests])

  // Stats
  const total      = tourRequests.length
  const approved   = tourRequests.filter(t => t.status === 'driver_approved' || t.status === 'confirmed').length
  const priceSent  = tourRequests.filter(t => t.status === 'price_sent_by_driver').length
  const completed  = tourRequests.filter(t => t.status === 'completed').length
  const totalKm    = tourRequests.reduce((s, t) => s + (t.total_distance_km || 0), 0)


  // ── ROUTING LOGIC: If a ride is active, show the Live Map instead of the dashboard ──
  if (activeRideTourId) {
    return (
      <LiveHireDriver
        tourId={activeRideTourId}
        token={token}
        onBack={() => {
          setActiveRideTourId(null) // Return to dashboard
          loadTourRequests()        // Refresh data in case they completed the tour
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col justify-between bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } min-h-screen`}
      >
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <i className="bi bi-car-front-fill text-xl"></i>
            </div>
            {sidebarOpen && <span className="text-lg font-bold text-white tracking-tight">SmartTour</span>}
          </div>

          {/* Nav */}
          <nav className="mt-6 px-3 space-y-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className={`${item.icon} text-lg flex-shrink-0`}></i>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom */}
        <div className="px-3 pb-8 space-y-2">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <i className={`bi bi-arrow-bar-${sidebarOpen ? 'left' : 'right'} text-lg`}></i>
            {sidebarOpen && <span>Collapse Menu</span>}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
          >
            <i className="bi bi-box-arrow-left text-lg"></i>
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="flex items-center justify-between bg-white px-8 py-5 shadow-sm border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">
              {activeTab === 'all' ? 'All Requests' : activeTab === 'approved' ? 'Approved Tours' : 'Negotiations'}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={loadTourRequests}
              disabled={loading}
              className="flex items-center gap-2 text-slate-600 hover:text-orange-500 text-sm font-bold transition-colors"
            >
              <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`}></i>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 leading-none">{userName || 'Driver'}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Professional Driver</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                {(userName || 'D').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Requests', value: total,     icon: 'bi-clipboard-data', color: 'from-blue-500 to-blue-600', text: 'text-blue-600' },
              { label: 'Approved',       value: approved,  icon: 'bi-check-circle',   color: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600' },
              { label: 'Negotiating',    value: priceSent, icon: 'bi-chat-dots',      color: 'from-amber-500 to-amber-600',   text: 'text-amber-600'  },
              { label: 'Total Distance', value: `${totalKm.toFixed(0)} km`, icon: 'bi-map', color: 'from-violet-500 to-violet-600', text: 'text-violet-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl bg-slate-50 ${s.text} group-hover:scale-110 transition-transform`}>
                    <i className={`bi ${s.icon}`}></i>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                </div>
                <p className="text-3xl font-black text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── Alerts ── */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 font-bold flex items-center gap-3">
              <i className="bi bi-exclamation-triangle-fill"></i> {error}
            </div>
          )}
          {info && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-700 font-bold flex items-center gap-3">
              <i className="bi bi-check-circle-fill"></i> {info}
            </div>
          )}

          {/* ── Tour Requests List ── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Tour Requests</h2>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-sm font-bold text-slate-500">{filteredTours.length} Available</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {loading && (
                <div className="py-20 text-center">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500 mb-4" />
                  <p className="text-slate-500 font-bold">Fetching latest requests...</p>
                </div>
              )}
              
              {!loading && filteredTours.length === 0 && (
                <div className="py-20 text-center px-8">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="bi bi-clipboard-x text-3xl text-slate-300"></i>
                  </div>
                  <p className="text-slate-500 font-bold">No tour requests found matching your filters.</p>
                </div>
              )}

              {!loading && filteredTours.map((tour) => (
                <div key={tour.id} className="p-8 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    
                    {/* Main Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest">
                          Tour #{tour.id}
                        </span>
                        <StatusBadge status={tour.status} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passenger</p>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                              {(tour.user_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-base font-bold text-slate-800 leading-tight">{tour.user_name || 'Anonymous'}</p>
                              <p className="text-xs text-slate-400 font-medium">{tour.user_email || 'No email provided'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Route & Distance</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <i className="bi bi-geo-alt text-orange-500 font-bold"></i>
                              <span className="text-base font-bold text-slate-800">{tour.total_distance_km || 0} km</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <i className="bi bi-clock text-blue-500 font-bold"></i>
                              <span className="text-base font-bold text-slate-800">{tour.total_days || 0} day(s)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl">
                          <i className="bi bi-calendar-event"></i>
                          <span>{tour.start_date || 'N/A'}</span>
                          <i className="bi bi-arrow-right mx-1 opacity-40"></i>
                          <span>{tour.end_date || 'N/A'}</span>
                        </div>
                        <div className="text-lg font-black text-slate-900">
                          <span className="text-sm font-bold text-slate-400 mr-1">Estimated:</span>
                          Rs. {Number(tour.estimated_price || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="lg:w-72 space-y-3">
                      <button
                        onClick={() => { setSelectedTourId(tour.id); setShowDetailsModal(true) }}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-slate-200 px-6 py-3 text-sm font-black text-slate-700 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm"
                      >
                        <i className="bi bi-map"></i> View Route & Details
                      </button>

                      {tour.status === 'confirmed' && (
                        <button
                          onClick={() => setActiveRideTourId(tour.id)}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white hover:bg-orange-600 transition shadow-lg shadow-orange-500/30"
                        >
                          <i className="bi bi-cursor-fill"></i> Start Driving
                        </button>
                      )}

                      {tour.status !== 'confirmed' && tour.status !== 'completed' && tour.status !== 'rejected' && (
                        <div className="space-y-3">
                          <button
                            onClick={() => handleApprove(tour.id)}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30"
                          >
                            <i className="bi bi-check-circle"></i> Approve Trip
                          </button>

                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                              <input
                                type="number"
                                min={1}
                                value={priceInputs[tour.id] || ''}
                                onChange={e => setPriceInputs(prev => ({ ...prev, [tour.id]: e.target.value }))}
                                placeholder="Counter"
                                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
                              />
                            </div>
                            <button
                              onClick={() => handleSendPrice(tour.id)}
                              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition shadow-md"
                            >
                              Negotiate
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <TourDetailsModal
        tourId={selectedTourId}
        token={token}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        userRole="driver"
      />
    </div>
  )
}