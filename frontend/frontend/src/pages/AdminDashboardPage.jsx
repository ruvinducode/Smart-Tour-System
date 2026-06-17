import { useCallback, useEffect, useMemo, useState } from 'react'
import { 
  approveDriver, 
  getAdminNotifications, 
  getApprovedDrivers, 
  getPendingDrivers, 
  getTourPlans,
  getAllUsers,
  getAllDrivers,
  rejectDriver,
  deactivateDriver,
  updateUser,
  deleteUser,
  updateDriverByAdmin,
  deleteTour,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'
import DriverDetailsModal from '../components/DriverDetailsModal.jsx'
import ConfirmationModal from '../components/ConfirmationModal.jsx'
import AdminEditUserModal from '../components/admin/AdminEditUserModal.jsx'
import AdminEditDriverModal from '../components/admin/AdminEditDriverModal.jsx'
import {
  AdminSectionHeader,
  AdminEmptyState,
  AdminUserCard,
  AdminDriverCard,
  filterBySearch,
} from '../components/admin/AdminDirectoryCards.jsx'
import {
  AdminTourCard,
  filterToursBySearch,
} from '../components/admin/AdminTourCards.jsx'
import AdminTourTrackingModal from '../components/admin/AdminTourTrackingModal.jsx'
import FinanceAdminPage from './FinanceAdminPage.jsx'
import DashboardChart from '../components/DashboardChart.jsx'
import DashboardPieChart from '../components/DashboardPieChart.jsx'
import DashboardStatCard from '../components/DashboardStatCard.jsx'
import Footer from '../components/Footer.jsx'
import {
  buildLast7DaysChart,
  buildStatusDistribution,
  computeAdminAnalytics,
  formatCurrency,
} from '../utils/dashboardAnalytics.js'
import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

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
  { id: 'overview',           icon: 'bi bi-grid-fill',           label: 'Dashboard'       },
  { id: 'registered_users',   icon: 'bi bi-people-fill',         label: 'Users List'      },
  { id: 'registered_drivers', icon: 'bi bi-truck-front-fill',    label: 'Drivers List'    },
  { id: 'pending',            icon: 'bi bi-person-plus-fill',     label: 'Pending Drivers'  },
  { id: 'tours',              icon: 'bi bi-map-fill',            label: 'Tour Requests'    },
  { id: 'finance',            icon: 'bi bi-currency-dollar',     label: 'Finance'          },
  { id: 'notifications',      icon: 'bi bi-bell-fill',           label: 'Notifications'    },
]

export default function AdminDashboardPage({ token, userName, onLogout }) {
  const [activeTab, setActiveTab]           = useState('overview')
  const [pendingDrivers, setPendingDrivers] = useState([])
  const [approvedDrivers, setApprovedDrivers] = useState([])
  const [allDrivers, setAllDrivers]         = useState([])
  const [users, setUsers]                   = useState([])
  const [tourPlans, setTourPlans]           = useState([])
  const [notifications, setNotifications]   = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [info, setInfo]                     = useState('')
  const [approvingId, setApprovingId]       = useState(null)
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showDriverModal, setShowDriverModal] = useState(false)
  
  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  })

  const [sidebarOpen, setSidebarOpen]       = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [driverSearch, setDriverSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const [tourSearch, setTourSearch] = useState('')
  const [trackingTour, setTrackingTour] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [editingDriver, setEditingDriver] = useState(null)
  const [savingEntity, setSavingEntity] = useState(false)

  const loadData = useCallback(async (silent = false) => {
    if (!token) {
      setError('No authentication token found. Please sign in again.')
      setLoading(false)
      return
    }

    setError(''); setInfo('')
    if (!silent) setLoading(true)
    try {
      const results = await Promise.allSettled([
        getPendingDrivers(token),
        getApprovedDrivers(token),
        getAllDrivers(token),
        getAllUsers(token),
        getTourPlans(token),
        getAdminNotifications(token),
      ])

      const [pending, approved, allD, allU, tours, notes] = results.map(r => r.status === 'fulfilled' ? r.value : [])
      
      // Check if any request failed with 401
      const isUnauthorized = results.some(r => r.status === 'rejected' && r.reason?.message?.includes('401'))
      if (isUnauthorized) {
        setError('Your session has expired. Please sign out and sign in again to continue.')
        if (!silent) setLoading(false)
        return
      }

      setPendingDrivers(Array.isArray(pending) ? pending : [])
      setApprovedDrivers(Array.isArray(approved) ? approved : [])
      setAllDrivers(Array.isArray(allD) ? allD : [])
      setUsers(Array.isArray(allU) ? allU : [])
      setTourPlans(Array.isArray(tours) ? tours : [])
      setNotifications(Array.isArray(notes) ? notes : [])

      if (results.every(r => r.status === 'rejected')) {
        setError('Could not load any dashboard data. Please check your connection or backend status.')
      }
    } catch (err) {
      if (!silent) setError(err.message || 'Could not load data')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const id = setInterval(() => loadData(true), 2000)
    return () => clearInterval(id)
  }, [loadData])

  const handleApprove = async (driverId) => {
    setConfirmState({
      isOpen: true,
      title: 'Approve Driver?',
      message: 'Are you sure you want to approve this driver? This will allow them to accept tour requests from users.',
      type: 'success',
      onConfirm: async () => {
        setApprovingId(driverId)
        try {
          await approveDriver(driverId, token)
          setInfo('Driver approved successfully!')
          setConfirmState(prev => ({ ...prev, isOpen: false }))
          loadData()
        } catch (err) {
          setError(err.message || 'Could not approve driver')
          setConfirmState(prev => ({ ...prev, isOpen: false }))
        } finally {
          setApprovingId(null)
        }
      }
    })
  }

  const handleReject = async (driverId) => {
    setConfirmState({
      isOpen: true,
      title: 'Reject Registration?',
      message: 'Are you sure you want to reject this driver registration? This will permanently delete their application.',
      type: 'warning',
      onConfirm: async () => {
        setApprovingId(driverId)
        try {
          await rejectDriver(driverId, token)
          setInfo('Driver registration rejected.')
          setConfirmState(prev => ({ ...prev, isOpen: false }))
          loadData()
        } catch (err) {
          setError(err.message || 'Could not reject driver')
          setConfirmState(prev => ({ ...prev, isOpen: false }))
        } finally {
          setApprovingId(null)
        }
      }
    })
  }

  const handleDeactivate = async (driverId) => {
    setConfirmState({
      isOpen: true,
      title: 'Deactivate Account?',
      message: 'Are you sure you want to deactivate this driver? They will no longer be able to log in or accept tours.',
      type: 'warning',
      onConfirm: async () => {
        setApprovingId(driverId)
        try {
          await deactivateDriver(driverId, token)
          setInfo('Driver account deactivated.')
          setConfirmState(prev => ({ ...prev, isOpen: false }))
          loadData()
        } catch (err) {
          setError(err.message || 'Could not deactivate driver')
          setConfirmState(prev => ({ ...prev, isOpen: false }))
        } finally {
          setApprovingId(null)
        }
      }
    })
  }

  const handleSaveUser = async (userId, form) => {
    setSavingEntity(true)
    try {
      await updateUser(userId, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        country: form.country,
        is_active: form.is_active,
      }, token)
      setInfo('User updated successfully.')
      setEditingUser(null)
      loadData()
    } catch (err) {
      setError(err.message || 'Could not update user')
    } finally {
      setSavingEntity(false)
    }
  }

  const handleDeleteUser = (user) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete User?',
      message: `Permanently delete ${user.name}? This cannot be undone if they have no active tours.`,
      type: 'danger',
      onConfirm: async () => {
        setApprovingId(user.id)
        try {
          await deleteUser(user.id, token)
          setInfo('User deleted successfully.')
          setConfirmState(prev => ({ ...prev, isOpen: false }))
          loadData()
        } catch (err) {
          setError(err.message || 'Could not delete user')
          setConfirmState(prev => ({ ...prev, isOpen: false }))
        } finally {
          setApprovingId(null)
        }
      },
    })
  }

  const handleSaveDriver = async (driverId, form) => {
    setSavingEntity(true)
    try {
      await updateDriverByAdmin(driverId, form, token)
      setInfo('Driver updated successfully.')
      setEditingDriver(null)
      loadData()
    } catch (err) {
      setError(err.message || 'Could not update driver')
    } finally {
      setSavingEntity(false)
    }
  }

  const handleDeleteTour = (tour) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Tour Request?',
      message: `Permanently delete Tour #${tour.id} (${tour.status})? This cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        setApprovingId(tour.id)
        try {
          await deleteTour(tour.id, token)
          setInfo(`Tour #${tour.id} deleted successfully.`)
          setConfirmState((prev) => ({ ...prev, isOpen: false }))
          loadData()
        } catch (err) {
          setError(err.message || 'Could not delete tour')
          setConfirmState((prev) => ({ ...prev, isOpen: false }))
        } finally {
          setApprovingId(null)
        }
      },
    })
  }

  const filteredUsers = useMemo(
    () => filterBySearch(users, userSearch, ['name', 'email', 'phone', 'country']),
    [users, userSearch],
  )
  const filteredDrivers = useMemo(
    () => filterBySearch(allDrivers, driverSearch, ['name', 'email', 'phone', 'vehicle', 'vehicle_number', 'nic_number']),
    [allDrivers, driverSearch],
  )
  const filteredPending = useMemo(
    () => filterBySearch(pendingDrivers, pendingSearch, ['name', 'email', 'phone', 'vehicle', 'nic_number', 'home_district']),
    [pendingDrivers, pendingSearch],
  )
  const filteredTours = useMemo(
    () => filterToursBySearch(tourPlans, tourSearch),
    [tourPlans, tourSearch],
  )

  const analytics = useMemo(
    () => computeAdminAnalytics(tourPlans, users, allDrivers, pendingDrivers, approvedDrivers),
    [tourPlans, users, allDrivers, pendingDrivers, approvedDrivers]
  )
  const weeklyChart = useMemo(() => buildLast7DaysChart(tourPlans), [tourPlans])
  const statusChart = useMemo(() => buildStatusDistribution(tourPlans), [tourPlans])

  const confirmed  = analytics.confirmed
  const negotiating = analytics.negotiating

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/20 font-sans text-slate-900 relative">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col justify-between bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } min-h-screen`}
      >
        {/* Logo */}
        <div>
          <div className="flex items-center gap-4 px-6 py-6 border-b border-slate-800">
            <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden border border-slate-700 shadow-lg shadow-orange-500/10">
              <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            {sidebarOpen && <span className="text-lg font-bold text-white tracking-tight">Air B&C ADMIN</span>}
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

      {/* ── Mobile Sidebar Drawer ── */}
      <aside className={`fixed top-0 left-0 h-full z-50 flex flex-col justify-between bg-slate-900 border-r border-slate-800 w-72 transition-all duration-300 lg:hidden ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          <div className="flex items-center gap-4 px-6 py-6 border-b border-slate-800">
            <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden border border-slate-700 shadow-lg shadow-orange-500/10">
              <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Air B&C ADMIN</span>
          </div>
          <nav className="mt-6 px-3 space-y-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className={`${item.icon} text-lg flex-shrink-0`}></i>
                <span>{item.label}</span>
                {item.id === 'pending' && pendingDrivers.length > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingDrivers.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="px-3 pb-8">
          <button onClick={onLogout} className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition">
            <i className="bi bi-box-arrow-left text-lg"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between bg-white/80 backdrop-blur-xl px-4 sm:px-6 py-3.5 shadow-sm border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <i className="bi bi-list text-xl"></i>
            </button>
            <div>
              <p className="text-base font-bold text-slate-800">{userName || 'Administrator'}</p>
              <p className="text-xs text-slate-400 hidden sm:block">Super Administrator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
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
        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-6 space-y-6">

          {/* Alerts */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <i className="bi bi-exclamation-triangle-fill text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-rose-800">Authentication Required</h3>
                  <p className="mt-1 text-sm text-rose-600">{error}</p>
                  {error.includes('session') || error.includes('token') || error.includes('sign in') ? (
                    <button
                      onClick={onLogout}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2 text-sm font-bold text-white hover:bg-rose-700 transition shadow-lg shadow-rose-600/20"
                    >
                      <i className="bi bi-box-arrow-left"></i>
                      Sign Out & Re-login
                    </button>
                  ) : (
                    <button
                      onClick={() => loadData()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-2 text-sm font-bold text-white hover:bg-slate-900 transition"
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {info  && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700 font-medium flex items-center gap-3">
              <i className="bi bi-check-circle-fill"></i>
              {info}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Revenue hero */}
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1a2e6f] via-[#243b88] to-indigo-900 p-6 sm:p-8 text-white shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.25),transparent_55%)]" />
                <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/80 mb-2">Platform Revenue</p>
                    <p className="text-4xl sm:text-5xl font-black">{formatCurrency(analytics.totalRevenue)}</p>
                    <p className="text-sm text-blue-100/70 mt-2">{analytics.completedTours} completed bookings</p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Pipeline', value: formatCurrency(analytics.pipelineRevenue) },
                      { label: 'Avg Booking', value: formatCurrency(analytics.avgBookingValue) },
                      { label: 'Active Tours', value: analytics.activeTours },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-200/60">{item.label}</p>
                        <p className="text-xl font-black mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <DashboardStatCard label="Total Users" value={analytics.totalUsers} icon="bi-people-fill" accent="blue" sub="Registered travelers" />
                <DashboardStatCard label="Active Drivers" value={analytics.activeDrivers} icon="bi-truck-front-fill" accent="emerald" sub={`${analytics.totalDrivers} total drivers`} />
                <DashboardStatCard label="Pending Drivers" value={analytics.pendingDrivers} icon="bi-hourglass-split" accent="orange" sub="Awaiting approval" />
                <DashboardStatCard label="Tour Requests" value={analytics.totalTours} icon="bi-map-fill" accent="violet" sub={`${analytics.confirmed} confirmed`} />
              </div>

              {/* Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <DashboardChart
                    data={weeklyChart}
                    title="Bookings & Revenue (Last 7 Days)"
                    barKey="bookings"
                    lineKey="revenue"
                  />
                </div>
                <div>
                  {statusChart.length > 0 ? (
                    <DashboardPieChart data={statusChart} title="Tour Status Distribution" />
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-100 p-8 h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                      No tour data yet
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Tours', value: analytics.totalTours, color: 'text-[#1a2e6f]' },
                  { label: 'Completed', value: analytics.completedTours, color: 'text-emerald-600' },
                  { label: 'Confirmed', value: confirmed, color: 'text-teal-600' },
                  { label: 'Negotiating', value: negotiating, color: 'text-amber-600' },
                  { label: 'Active Now', value: analytics.activeTours, color: 'text-orange-600' },
                  { label: 'Pending Drivers', value: analytics.pendingDrivers, color: 'text-rose-600' },
                ].map((row) => (
                  <div key={row.label} className="rounded-2xl bg-white border border-slate-200 shadow-sm px-5 py-5 hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{row.label}</p>
                    <p className={`text-2xl font-black ${row.color}`}>{row.value}</p>
                  </div>
                ))}
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
          )}

          {/* ── REGISTERED USERS ── */}
          {activeTab === 'registered_users' && (
            <div>
              <AdminSectionHeader
                title="Registered Users"
                subtitle="Manage traveler accounts, update profiles, and control access."
                count={filteredUsers.length}
                countLabel="Users shown"
                accent="blue"
                search={userSearch}
                onSearchChange={setUserSearch}
                placeholder="Search name, email, phone…"
              />
              {loading ? (
                <div className="py-20 text-center">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1a2e6f]" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <AdminEmptyState icon="bi-people" title="No users found" message="Try adjusting your search or check back later." />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredUsers.map((u) => (
                    <AdminUserCard
                      key={u.id}
                      user={u}
                      onEdit={setEditingUser}
                      onDelete={handleDeleteUser}
                      busy={approvingId === u.id || savingEntity}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── REGISTERED DRIVERS (ALL) ── */}
          {activeTab === 'registered_drivers' && (
            <div>
              <AdminSectionHeader
                title="Driver Directory"
                subtitle="View all registered drivers, edit profiles, and manage approval status."
                count={filteredDrivers.length}
                countLabel="Drivers shown"
                accent="orange"
                search={driverSearch}
                onSearchChange={setDriverSearch}
                placeholder="Search name, vehicle, NIC…"
              />
              {loading ? (
                <div className="py-20 text-center">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
                </div>
              ) : filteredDrivers.length === 0 ? (
                <AdminEmptyState icon="bi-truck-front" title="No drivers found" message="Try adjusting your search or check back later." />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredDrivers.map((d) => (
                    <AdminDriverCard
                      key={d.id}
                      driver={d}
                      variant="all"
                      busy={approvingId === d.id || savingEntity}
                      onView={(driver) => { setSelectedDriver(driver); setShowDriverModal(true) }}
                      onEdit={setEditingDriver}
                      onApprove={handleApprove}
                      onDeactivate={handleDeactivate}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PENDING DRIVERS ── */}
          {activeTab === 'pending' && (
            <div>
              <AdminSectionHeader
                title="Pending Approvals"
                subtitle="Review new driver applications and approve or reject registrations."
                count={filteredPending.length}
                countLabel="Awaiting review"
                accent="rose"
                search={pendingSearch}
                onSearchChange={setPendingSearch}
                placeholder="Search applicant, vehicle, district…"
              />
              {loading ? (
                <div className="py-20 text-center">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-rose-500" />
                </div>
              ) : filteredPending.length === 0 ? (
                <AdminEmptyState icon="bi-hourglass-split" title="All caught up" message="No pending driver applications at the moment." />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredPending.map((driver) => (
                    <AdminDriverCard
                      key={driver.id}
                      driver={driver}
                      variant="pending"
                      busy={approvingId === driver.id || savingEntity}
                      onView={(d) => { setSelectedDriver(d); setShowDriverModal(true) }}
                      onEdit={setEditingDriver}
                      onApprove={handleApprove}
                      onDeactivate={handleDeactivate}
                      onReject={handleReject}
                    />
                  ))}
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
                      <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                        <p>📧 {driver.email}</p>
                        <p>📱 {driver.phone}</p>
                        <p>🚗 {driver.vehicle} · {driver.capacity} seats</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedDriver(driver); setShowDriverModal(true) }}
                          className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                        >
                          🔍 Details
                        </button>
                        <button
                          onClick={() => handleDeactivate(driver.id)}
                          disabled={approvingId === driver.id}
                          className="flex-1 rounded-xl bg-rose-100 py-2 text-xs font-bold text-rose-600 hover:bg-rose-200 transition"
                        >
                          {approvingId === driver.id ? '...' : 'Deactivate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TOUR REQUESTS ── */}
          {activeTab === 'tours' && (
            <div>
              <AdminSectionHeader
                title="Tour Requests"
                subtitle="Monitor all bookings with traveler and driver details. Track active tours live on the map."
                count={filteredTours.length}
                countLabel="Tours shown"
                accent="violet"
                search={tourSearch}
                onSearchChange={setTourSearch}
                placeholder="Search tour #, user, driver, status…"
              />
              {loading ? (
                <div className="py-20 text-center">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
                </div>
              ) : filteredTours.length === 0 ? (
                <AdminEmptyState icon="bi-map" title="No tours found" message="Try adjusting your search or check back when new bookings arrive." />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredTours.map((tour) => (
                    <AdminTourCard
                      key={tour.id}
                      tour={tour}
                      busy={approvingId === tour.id || savingEntity}
                      onViewDetails={(t) => {
                        setSelectedTourId(t.id)
                        setShowDetailsModal(true)
                      }}
                      onTrack={setTrackingTour}
                      onDelete={handleDeleteTour}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FINANCE MANAGEMENT ── */}
          {activeTab === 'finance' && (
            <FinanceAdminPage token={token} />
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (() => {
            const unreadCount = notifications.filter(n => n.status !== 'read').length

            const handleMarkRead = async (id) => {
              try {
                await markNotificationRead(id, token)
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n))
              } catch { /* silent */ }
            }

            const handleMarkAllRead = async () => {
              try {
                await markAllNotificationsRead(token)
                setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })))
              } catch { /* silent */ }
            }

            const handleDismiss = async (id) => {
              try {
                await deleteNotification(id, token)
                setNotifications(prev => prev.filter(n => n.id !== id))
              } catch { /* silent */ }
            }

            const handleClearAll = async () => {
              try {
                await clearAllNotifications(token)
                setNotifications([])
              } catch { /* silent */ }
            }

            return (
              <div className="space-y-5 max-w-4xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Activity Notifications</h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      {unreadCount > 0 ? <span className="text-[#1a2e6f]">{unreadCount} unread</span> : 'All caught up'} · {notifications.length} total
                    </p>
                  </div>
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-2 text-xs font-bold text-[#1a2e6f] border border-[#1a2e6f]/20 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition"
                        >
                          <i className="bi bi-check2-all"></i> Mark All Read
                        </button>
                      )}
                      <button
                        onClick={handleClearAll}
                        className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition"
                      >
                        <i className="bi bi-trash3-fill"></i> Clear All
                      </button>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="py-12 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1a2e6f]" /></div>
                ) : notifications.length === 0 ? (
                  <div className="rounded-3xl bg-white border border-slate-100 p-16 text-center shadow-sm">
                    <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <i className="bi bi-bell-slash text-2xl text-slate-300"></i>
                    </div>
                    <p className="text-sm font-bold text-slate-400">No notifications yet.</p>
                    <p className="text-xs text-slate-300 mt-1">System events and updates will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(note => {
                      const isUnread = note.status !== 'read'
                      return (
                        <div
                          key={note.id}
                          onClick={() => {
                            if (isUnread) handleMarkRead(note.id)
                            if (note.tour_id) { setSelectedTourId(note.tour_id); setShowDetailsModal(true) }
                          }}
                          className={`group flex items-start gap-4 rounded-2xl border px-5 py-4 shadow-sm transition-all cursor-pointer hover:shadow-md ${
                            isUnread
                              ? 'bg-blue-50/50 border-blue-200 border-l-4 border-l-[#1a2e6f]'
                              : 'bg-white border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          {/* Status dot */}
                          <div className="flex-shrink-0 mt-1">
                            <div className={`h-2.5 w-2.5 rounded-full ${isUnread ? 'bg-[#1a2e6f]' : 'bg-slate-200'}`} />
                          </div>

                          {/* Bell icon */}
                          <div className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center text-base ${
                            isUnread ? 'bg-[#1a2e6f] text-white shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <i className="bi bi-bell-fill"></i>
                          </div>

                          {/* Body */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug mb-0.5 ${
                              isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-600'
                            }`}>{note.subject}</p>
                            <p className={`text-xs leading-relaxed line-clamp-2 ${
                              isUnread ? 'text-slate-600' : 'text-slate-400'
                            }`}>{note.message}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] text-slate-400 font-medium">
                                {note.created_at ? new Date(note.created_at).toLocaleString() : '—'}
                              </span>
                              {note.tour_id && (
                                <span className="text-[10px] font-black text-[#1a2e6f] uppercase tracking-wider flex items-center gap-1">
                                  <i className="bi bi-arrow-right-circle"></i> View Tour #{note.tour_id}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dismiss button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDismiss(note.id) }}
                            className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                            title="Dismiss"
                          >
                            <i className="bi bi-x-lg text-sm"></i>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
        <Footer variant="dashboard" portal="admin" />
      </main>

      <TourDetailsModal
        tourId={selectedTourId}
        token={token}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        userRole="admin"
      />

      <DriverDetailsModal
        driver={selectedDriver}
        isOpen={showDriverModal}
        onClose={() => setShowDriverModal(false)}
        onApprove={handleApprove}
        approving={approvingId === selectedDriver?.id}
      />

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        isLoading={approvingId !== null}
      />

      <AdminEditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveUser}
        saving={savingEntity}
      />

      <AdminEditDriverModal
        driver={editingDriver}
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        onSave={handleSaveDriver}
        saving={savingEntity}
      />

      <AdminTourTrackingModal
        tour={trackingTour}
        token={token}
        isOpen={!!trackingTour}
        onClose={() => setTrackingTour(null)}
      />
    </div>
  )
}
