const COMPLETED = new Set(['completed'])
const ACTIVE = new Set(['driver_approved', 'confirmed', 'en_route', 'arrived', 'ongoing'])
const PENDING = new Set(['planned', 'price_sent_by_driver'])

const STATUS_LABELS = {
  planned: 'Pending',
  driver_approved: 'Approved',
  price_sent_by_driver: 'Negotiating',
  confirmed: 'Confirmed',
  en_route: 'En Route',
  arrived: 'Arrived',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function getTourEarnings(tour) {
  return Number(tour?.driver_price ?? tour?.estimated_price ?? 0) || 0
}

export function getTourDateKey(tour) {
  const raw = tour?.start_date || tour?.created_at
  if (!raw) return null
  return String(raw).split(/[T ]/)[0]
}

export function buildLast7DaysChart(tours) {
  const result = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = formatDateKey(d)
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    const dayTours = tours.filter((t) => getTourDateKey(t) === key)
    const amount = dayTours.reduce((sum, t) => sum + getTourEarnings(t), 0)
    result.push({
      name: label,
      trips: dayTours.length,
      earnings: amount,
      revenue: amount,
      bookings: dayTours.length,
      spending: amount,
    })
  }
  return result
}

export function buildStatusDistribution(tours) {
  const counts = {}
  tours.forEach((t) => {
    const name = STATUS_LABELS[t.status] || t.status || 'Other'
    counts[name] = (counts[name] || 0) + 1
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function computeDriverAnalytics(tours) {
  const completed = tours.filter((t) => COMPLETED.has(t.status))
  const active = tours.filter((t) => ACTIVE.has(t.status))
  const pending = tours.filter((t) => PENDING.has(t.status))

  const totalEarnings = completed.reduce((s, t) => s + getTourEarnings(t), 0)
  const pendingEarnings = [...active, ...pending].reduce((s, t) => s + getTourEarnings(t), 0)
  const totalKm = tours.reduce((s, t) => s + (Number(t.total_distance_km) || 0), 0)
  const avgPerTrip = completed.length ? totalEarnings / completed.length : 0

  return {
    total: tours.length,
    completedCount: completed.length,
    activeCount: active.length,
    pendingCount: pending.length,
    negotiatingCount: tours.filter((t) => t.status === 'price_sent_by_driver').length,
    approvedCount: tours.filter((t) => ACTIVE.has(t.status)).length,
    totalEarnings,
    pendingEarnings,
    totalKm,
    avgPerTrip,
    completionRate: tours.length ? Math.round((completed.length / tours.length) * 100) : 0,
  }
}

export function computeAdminAnalytics(tourPlans, users, allDrivers, pendingDrivers, approvedDrivers) {
  const completed = tourPlans.filter((t) => t.status === 'completed')
  const confirmed = tourPlans.filter((t) => t.status === 'confirmed').length
  const negotiating = tourPlans.filter((t) => t.status === 'price_sent_by_driver').length
  const active = tourPlans.filter((t) => ACTIVE.has(t.status)).length
  const totalRevenue = completed.reduce((s, t) => s + getTourEarnings(t), 0)
  const pipelineRevenue = tourPlans
    .filter((t) => !COMPLETED.has(t.status) && t.status !== 'cancelled' && t.status !== 'rejected')
    .reduce((s, t) => s + getTourEarnings(t), 0)

  return {
    totalUsers: users.length,
    totalDrivers: allDrivers.length,
    activeDrivers: approvedDrivers.length,
    pendingDrivers: pendingDrivers.length,
    totalTours: tourPlans.length,
    completedTours: completed.length,
    confirmed,
    negotiating,
    activeTours: active,
    totalRevenue,
    pipelineRevenue,
    avgBookingValue: tourPlans.length
      ? tourPlans.reduce((s, t) => s + getTourEarnings(t), 0) / tourPlans.length
      : 0,
  }
}

export function computeUserAnalytics(tours) {
  const completed = tours.filter((t) => t.status === 'completed')
  const active = tours.filter((t) => ACTIVE.has(t.status))
  return {
    totalTrips: tours.length,
    completedTrips: completed.length,
    activeTrips: active.length,
    totalSpent: tours.reduce((s, t) => s + getTourEarnings(t), 0),
    totalDistance: tours.reduce((s, t) => s + (Number(t.total_distance_km) || 0), 0),
    negotiations: tours.filter((t) => t.status === 'price_sent_by_driver').length,
  }
}

export function formatCurrency(amount) {
  return `Rs. ${Math.round(amount).toLocaleString()}`
}
