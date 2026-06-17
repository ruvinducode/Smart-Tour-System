const ACTIVE_STATUSES = new Set(['en_route', 'arrived', 'ongoing', 'completed', 'cancelled'])
const USER_TRACKABLE_STATUSES = new Set(['confirmed', 'driver_approved', 'en_route', 'arrived', 'ongoing'])

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function isTourScheduleLocked(tour, now = new Date()) {
  if (!tour?.start_date) return false
  if (ACTIVE_STATUSES.has(tour.status)) return false

  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  return todayStr < tour.start_date
}

export function canUserStartLiveTracking(tour, now = new Date()) {
  if (!tour || !USER_TRACKABLE_STATUSES.has(tour.status)) return false
  return !isTourScheduleLocked(tour, now)
}

export function isUserAwaitingScheduleStart(tour, now = new Date()) {
  if (!tour) return false
  return ['confirmed', 'driver_approved'].includes(tour.status) && isTourScheduleLocked(tour, now)
}

export function formatTourSchedule(tour) {
  if (!tour?.start_date) return 'Not scheduled'
  return tour.start_date
}
