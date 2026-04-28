import { useCallback, useEffect, useState } from 'react'
import { approveDriver, getAdminNotifications, getApprovedDrivers, getPendingDrivers, getTourPlans } from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'

const tourStatusStyle = {
  planned:              { label: 'Planned',      bg: 'bg-blue-100',    text: 'text-blue-800'   },
  confirmed:            { label: 'Confirmed',    bg: 'bg-emerald-100', text: 'text-emerald-800'},
  driver_approved:      { label: 'Approved',     bg: 'bg-teal-100',    text: 'text-teal-800'   },
  price_sent_by_driver: { label: 'Negotiating',  bg: 'bg-amber-100',   text: 'text-amber-800'  },
  rejected:             { label: 'Rejected',     bg: 'bg-rose-100',    text: 'text-rose-700'   },
  completed:            { label: 'Completed',    bg: 'bg-indigo-100',  text: 'text-indigo-800' },
}

function TourBadge({ status }) {
  const s = tourStatusStyle[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

const NAV_ITEMS = [
  { id: 'overview',       icon: 'bi bi-grid-fill',       label: 'Dashboard'       },
  { id: 'pending',        icon: 'bi bi-person-plus-fill', label: 'Pending Drivers'  },
  { id: 'approved',       icon: 'bi bi-people-fill',      label: 'Active Drivers'   },
  { id: 'tours',          icon: 'bi bi-map-fill',         label: 'Tour Requests'    },
  { id: 'notifications',  icon: 'bi bi-bell-fill',        label: 'Notifications'    },
]

export default function AdminDashboardPage({ token, userName, onLogout }) {
  const [activeTab, setActiveTab]           = useState('overview')
  const [pendingDrivers, setPendingDrivers] = useState([])
  const [approvedDrivers, setApprovedDrivers] = useState([])
  const [tourPlans, setTourPlans]           = useState([])
  const [notifications, setNotifications]   = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [info, setInfo]                     = useState('')
  const [approvingId, setApprovingId]       = useState(null)
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [sidebarOpen, setSidebarOpen]       = useState(true)

  const loadData = useCallback(async () => {
    setError(''); setInfo(''); setLoading(true)
    try {
      const [pending, approved, tours, notes] = await Promise.all([
        getPendingDrivers(token),
        getApprovedDrivers(token),
        getTourPlans(token),
        getAdminNotifications(token),
      ])
      setPendingDrivers(Array.isArray(pending) ? pending : [])
      setApprovedDrivers(Array.isArray(approved) ? approved : [])
      setTourPlans(Array.isArray(tours) ? tours : [])
      setNotifications(Array.isArray(notes) ? notes : [])
    } catch (err) {
      setError(err.message || 'Could not load data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  const handleApprove = async (driverId) => {
    setApprovingId(driverId)
    try {
      await approveDriver(driverId, token)
      setInfo('Driver approved successfully!')
      loadData()
    } catch (err) {
      setError(err.message || 'Could not approve driver')
    } finally {
      setApprovingId(null)
    }
  }

  const confirmed  = tourPlans.filter(t => t.status === 'confirmed').length
  const negotiating = tourPlans.filter(t => t.status === 'price_sent_by_driver').length

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
              <i className="bi bi-shield-lock-fill text-xl"></i>
            </div>
            {sidebarOpen && <span className="text-lg font-bold text-white tracking-tight">AdminPanel</span>}
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
                {sidebarOpen && item.id === 'pending' && pendingDrivers.length > 0 && (
                  <span className="ml-auto h-5 w-5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black shadow-lg shadow-rose-500/30">
                    {pendingDrivers.length}
                  </span>
                )}
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

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between bg-white px-6 py-3.5 shadow-sm border-b border-slate-100">
          <div>
            <p className="text-base font-bold text-slate-800">{userName || 'Administrator'}</p>
            <p className="text-xs text-slate-400">Super Administrator</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="text-slate-500 hover:text-[#1a2e6f] text-sm font-semibold border border-slate-200 rounded-full px-4 py-1.5 transition hover:border-[#1a2e6f]"
            >
              {loading ? '⟳ Loading…' : '⟳ Refresh'}
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="h-7 w-7 rounded-full bg-[#1a2e6f] flex items-center justify-center text-white text-xs font-bold">
                {(userName || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="text-xs leading-tight">
                <p className="font-bold text-slate-800">{userName || 'Admin'}</p>
                <p className="text-slate-400">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Alerts */}
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700 font-medium">⚠ {error}</div>}
          {info  && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700 font-medium">✓ {info}</div>}

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Total Users',      value: '—',                      icon: '👤', color: 'from-blue-50 to-white',    accent: 'text-[#1a2e6f]' },
                  { label: 'Active Drivers',   value: approvedDrivers.length,   icon: '🚗', color: 'from-emerald-50 to-white', accent: 'text-emerald-700' },
                  { label: 'Pending Drivers',  value: pendingDrivers.length,    icon: '⏳', color: 'from-amber-50 to-white',   accent: 'text-amber-700'  },
                  { label: 'Tour Requests',    value: tourPlans.length,         icon: '📋', color: 'from-violet-50 to-white',  accent: 'text-violet-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-2xl bg-gradient-to-br ${s.color} border border-slate-200 p-5 shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
                      <span className="text-xl">{s.icon}</span>
                    </div>
                    <p className={`text-3xl font-black ${s.accent}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Trip Statistics + Quick Actions */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Trip Statistics */}
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-800">Trip Statistics</h3>
                    <span className="rounded-full bg-[#1a2e6f] text-white text-xs font-bold px-3 py-1">Overview</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      { label: 'Total Tours',    value: tourPlans.length,                                    color: 'text-[#1a2e6f]' },
                      { label: 'Confirmed',      value: confirmed,                                           color: 'text-emerald-600' },
                      { label: 'Negotiating',    value: negotiating,                                         color: 'text-amber-600' },
                      { label: 'Pending Approval', value: pendingDrivers.length,                             color: 'text-rose-600' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-6 py-4">
                        <p className="text-sm text-slate-600 font-medium">{row.label}</p>
                        <p className={`text-xl font-black ${row.color}`}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions + System Status */}
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <button onClick={() => setActiveTab('pending')}
                        className="w-full rounded-xl bg-[#1a2e6f] text-white py-2.5 text-sm font-bold hover:bg-[#253d94] transition shadow-sm">
                        Review Pending Drivers →
                      </button>
                      <button onClick={() => setActiveTab('tours')}
                        className="w-full rounded-xl bg-emerald-500 text-white py-2.5 text-sm font-bold hover:bg-emerald-600 transition shadow-sm">
                        View Tour Requests →
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">System Status</h3>
                    {[
                      { label: 'API Connection', status: '✓ Active' },
                      { label: 'Database',       status: '✓ Connected' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                        <span className="text-sm text-slate-600">{item.label}</span>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PENDING DRIVERS ── */}
          {activeTab === 'pending' && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800">Pending Driver Approvals</h2>
                <span className="rounded-full bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1">{pendingDrivers.length} waiting</span>
              </div>
              {loading ? (
                <div className="py-12 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1a2e6f]" /></div>
              ) : pendingDrivers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No pending drivers at the moment.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3 text-left">ID</th>
                        <th className="px-5 py-3 text-left">Name</th>
                        <th className="px-5 py-3 text-left">Email</th>
                        <th className="px-5 py-3 text-left">Phone</th>
                        <th className="px-5 py-3 text-left">Vehicle</th>
                        <th className="px-5 py-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingDrivers.map(driver => (
                        <tr key={driver.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-4 font-bold text-[#1a2e6f]">#{driver.id}</td>
                          <td className="px-5 py-4 font-semibold text-slate-800">{driver.name}</td>
                          <td className="px-5 py-4 text-slate-500">{driver.email}</td>
                          <td className="px-5 py-4 text-slate-500">{driver.phone}</td>
                          <td className="px-5 py-4 text-slate-600 font-medium">{driver.vehicle}</td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => handleApprove(driver.id)}
                              disabled={approvingId === driver.id}
                              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-60 transition shadow-sm"
                            >
                              {approvingId === driver.id ? 'Approving…' : '✓ Approve'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── APPROVED DRIVERS ── */}
          {activeTab === 'approved' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">Active Drivers</h2>
                <span className="text-xs text-slate-400 font-semibold">{approvedDrivers.length} drivers</span>
              </div>
              {loading ? (
                <div className="py-12 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1a2e6f]" /></div>
              ) : approvedDrivers.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-400 text-sm">No approved drivers yet.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {approvedDrivers.map(driver => (
                    <div key={driver.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-[#1a2e6f] flex items-center justify-center text-white font-bold text-sm">
                          {driver.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{driver.name}</p>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Active</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <p>📧 {driver.email}</p>
                        <p>📱 {driver.phone}</p>
                        <p>🚗 {driver.vehicle} · {driver.capacity} seats</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TOUR REQUESTS ── */}
          {activeTab === 'tours' && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800">Tour Requests</h2>
                <span className="rounded-full bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1">{tourPlans.length} total</span>
              </div>
              {loading ? (
                <div className="py-12 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1a2e6f]" /></div>
              ) : tourPlans.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No tour requests yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3 text-left">Tour #</th>
                        <th className="px-5 py-3 text-left">Distance</th>
                        <th className="px-5 py-3 text-left">Days</th>
                        <th className="px-5 py-3 text-left">Price</th>
                        <th className="px-5 py-3 text-left">Status</th>
                        <th className="px-5 py-3 text-left">Created</th>
                        <th className="px-5 py-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tourPlans.map(tour => (
                        <tr key={tour.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-4 font-bold text-[#1a2e6f]">#{tour.id}</td>
                          <td className="px-5 py-4 text-slate-700 font-medium">{tour.total_distance_km} km</td>
                          <td className="px-5 py-4 text-slate-700">{tour.total_days} days</td>
                          <td className="px-5 py-4 font-bold text-slate-800">Rs. {Number(tour.estimated_price || 0).toFixed(0)}</td>
                          <td className="px-5 py-4"><TourBadge status={tour.status} /></td>
                          <td className="px-5 py-4 text-slate-400 text-xs">{tour.created_at ? new Date(tour.created_at).toLocaleDateString() : '—'}</td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => { setSelectedTourId(tour.id); setShowDetailsModal(true) }}
                              className="rounded-xl bg-[#1a2e6f] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#253d94] transition shadow-sm"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">Activity Notifications</h2>
                <span className="text-xs text-slate-400 font-semibold">{notifications.length} total</span>
              </div>
              {loading ? (
                <div className="py-12 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1a2e6f]" /></div>
              ) : notifications.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-400 text-sm">No notifications yet.</div>
              ) : (
                notifications.map(note => (
                  <div key={note.id} className="flex items-start gap-4 rounded-2xl bg-white border border-slate-200 border-l-4 border-l-[#1a2e6f] px-5 py-4 shadow-sm hover:shadow-md transition">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-[#1a2e6f] text-sm">🔔</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{note.subject}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{note.message}</p>
                    </div>
                    <p className="text-xs text-slate-400 whitespace-nowrap">{note.created_at ? new Date(note.created_at).toLocaleDateString() : '—'}</p>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </main>

      <TourDetailsModal
        tourId={selectedTourId}
        token={token}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        userRole="admin"
      />
    </div>
  )
}
