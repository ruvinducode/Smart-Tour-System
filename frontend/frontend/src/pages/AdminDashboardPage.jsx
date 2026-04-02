import { useCallback, useEffect, useState } from 'react'
import { approveDriver, getAdminNotifications, getApprovedDrivers, getPendingDrivers, getTourPlans } from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'

export default function AdminDashboardPage({ token, userName, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [pendingDrivers, setPendingDrivers] = useState([])
  const [approvedDrivers, setApprovedDrivers] = useState([])
  const [tourPlans, setTourPlans] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [approvingId, setApprovingId] = useState(null)
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const loadData = useCallback(async () => {
    setError('')
    setInfo('')
    setLoading(true)
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

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = async (driverId) => {
    setApprovingId(driverId)
    try {
      await approveDriver(driverId, token)
      setInfo('Driver approved successfully!')
      setPendingDrivers((prev) => prev.filter((d) => d.id !== driverId))
      loadData()
    } catch (err) {
      setError(err.message || 'Could not approve driver')
    } finally {
      setApprovingId(null)
    }
  }

  const stats = [
    { label: 'Pending Drivers', value: pendingDrivers.length, color: 'orange' },
    { label: 'Approved Drivers', value: approvedDrivers.length, color: 'emerald' },
    { label: 'Total Tour Plans', value: tourPlans.length, color: 'blue' },
    { label: 'Notifications', value: notifications.length, color: 'blue' },
  ]

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">⚙</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Smart Tour Admin</h1>
                <p className="text-xs text-slate-400">System Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
              <div className="text-right text-sm">
                <p className="text-slate-300 font-medium">{userName || 'Admin'}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 text-sm font-semibold transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-700 bg-slate-900/40 sticky top-14 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Dashboard', icon: '📊' },
              { id: 'pending', label: 'Pending Drivers', icon: '⏳' },
              { id: 'approved', label: 'Approved Drivers', icon: '✅' },
              { id: 'tours', label: 'Tour Requests', icon: '🗺️' },
              { id: 'notifications', label: 'Notifications', icon: '🔔' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-900/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-6 rounded-lg border border-emerald-500 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
            {info}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Dashboard Overview</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm hover:bg-slate-800 transition"
                  >
                    <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${stat.color === 'orange' ? 'text-orange-400' : stat.color === 'emerald' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => setActiveTab('pending')} className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 font-medium text-sm transition">
                    Review Pending Drivers →
                  </button>
                  <button onClick={() => setActiveTab('tours')} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 font-medium text-sm transition">
                    View Tour Requests →
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                <h3 className="text-lg font-bold text-white mb-4">System Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">API Connection</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-900 text-emerald-200 font-semibold">✓ Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Database</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-900 text-emerald-200 font-semibold">✓ Connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Drivers Tab */}
        {activeTab === 'pending' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Pending Driver Approvals</h2>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading pending drivers...</div>
            ) : pendingDrivers.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                <p className="text-slate-400">No pending drivers at the moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {pendingDrivers.map((driver) => (
                      <tr key={driver.id} className="bg-slate-900/50 hover:bg-slate-800/50 transition">
                        <td className="px-6 py-3 text-sm text-slate-300">{driver.id}</td>
                        <td className="px-6 py-3 text-sm font-medium text-white">{driver.name}</td>
                        <td className="px-6 py-3 text-sm text-slate-400">{driver.email}</td>
                        <td className="px-6 py-3 text-sm text-slate-400">{driver.phone}</td>
                        <td className="px-6 py-3 text-sm text-slate-400">{driver.vehicle}</td>
                        <td className="px-6 py-3 text-sm">
                          <button
                            onClick={() => handleApprove(driver.id)}
                            disabled={approvingId === driver.id}
                            className="rounded px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {approvingId === driver.id ? 'Approving...' : 'Approve'}
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

        {/* Approved Drivers Tab */}
        {activeTab === 'approved' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Approved Drivers</h2>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading approved drivers...</div>
            ) : approvedDrivers.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                <p className="text-slate-400">No approved drivers yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approvedDrivers.map((driver) => (
                  <div key={driver.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-800/70 transition">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">{driver.name}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-900 text-emerald-200 font-semibold">✓ Active</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-400">📧 {driver.email}</p>
                      <p className="text-slate-400">📱 {driver.phone}</p>
                      <p className="text-slate-400">🚗 {driver.vehicle}</p>
                      <p className="text-slate-400">👥 Capacity: {driver.capacity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tour Requests Tab */}
        {activeTab === 'tours' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Tour Requests</h2>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading tour requests...</div>
            ) : tourPlans.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                <p className="text-slate-400">No tour requests yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Distance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {tourPlans.map((tour) => (
                      <tr key={tour.id} className="bg-slate-900/50 hover:bg-slate-800/50 transition">
                        <td className="px-6 py-3 text-sm text-slate-300">{tour.id}</td>
                        <td className="px-6 py-3 text-sm text-slate-400">{tour.total_distance_km} km</td>
                        <td className="px-6 py-3 text-sm text-slate-400">{tour.total_days}</td>
                        <td className="px-6 py-3 text-sm text-slate-400">₨ {tour.estimated_price?.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            tour.status === 'planned' ? 'bg-blue-900 text-blue-200' :
                            tour.status === 'confirmed' ? 'bg-emerald-900 text-emerald-200' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {tour.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-400">{new Date(tour.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-3 text-sm">
                          <button
                            onClick={() => {
                              setSelectedTourId(tour.id)
                              setShowDetailsModal(true)
                            }}
                            className="text-blue-400 hover:text-blue-300 font-semibold text-xs transition"
                          >
                            View →
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

        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Driver Activity Notifications</h2>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                <p className="text-slate-400">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((note) => (
                  <div key={note.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                    <p className="text-sm font-bold text-white">{note.subject}</p>
                    <p className="mt-1 text-sm text-slate-300">{note.message}</p>
                    <p className="mt-2 text-xs text-slate-500">{note.created_at ? new Date(note.created_at).toLocaleString() : '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
