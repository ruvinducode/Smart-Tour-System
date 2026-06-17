function normalizeApiBase(raw) {
  const fallback = import.meta.env.DEV ? '' : 'http://127.0.0.1:5001'
  const base = (raw || fallback).trim().replace(/\/$/, '')
  if (!base) return ''
  if (/^https?:\/\//i.test(base)) return base
  return `http://${base}`
}

const DEFAULT_API = normalizeApiBase(import.meta.env.VITE_API_URL)
const API_BASE_URL = DEFAULT_API // Alias for backward compatibility and to fix "undefined" errors

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_API}${p}`
}

export function getApiBaseUrl() {
  return DEFAULT_API
}

export async function rejectDriver(driverId, token) {
  const res = await fetch(apiUrl(`/admin/driver/reject/${driverId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function deactivateDriver(driverId, token) {
  const res = await fetch(apiUrl(`/admin/driver/deactivate/${driverId}`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getDriverProfile(token) {
  const res = await fetch(apiUrl('/driver/profile'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getMyDriverPayments(token) {
  const res = await fetch(apiUrl('/driver/payments'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function updateDriverProfile(payload, token) {
  const isFormData = payload instanceof FormData
  const headers = { Authorization: `Bearer ${token}` }
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const res = await fetch(apiUrl('/driver/profile'), {
    method: 'PUT',
    headers,
    body: isFormData ? payload : JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function registerUser(payload) {
  const res = await fetch(apiUrl('/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function loginUser(payload) {
  const res = await fetch(apiUrl('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function registerDriver(payload) {
  // Build FormData so image files are sent as multipart/form-data
  const formData = new FormData()
  const imageKeys = [
    'profile_photo',
    'license_front_image',
    'license_back_image',
    'vehicle_reg_book_image',
    'revenue_license_image',
    'insurance_cert_image',
    'vehicle_front_image',
    'vehicle_rear_image',
    'vehicle_side_image',
  ]
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    if (imageKeys.includes(key)) {
      if (value instanceof File) formData.append(key, value)
    } else {
      formData.append(key, String(value))
    }
  })

  const res = await fetch(apiUrl('/driver/register'), {
    method: 'POST',
    // Do NOT set Content-Type header — browser sets multipart boundary automatically
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}


export async function loginDriver(payload) {
  const res = await fetch(apiUrl('/driver/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function lookupAccountRole(email) {
  const res = await fetch(apiUrl('/account-role'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function calculateTourEstimate(payload) {
  const res = await fetch(apiUrl('/tour/calculate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function createTour(payload, token) {
  const res = await fetch(apiUrl('/tour/create-tour'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getPendingDrivers(token) {
  const res = await fetch(apiUrl('/admin/drivers/pending'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function approveDriver(driverId, token) {
  const res = await fetch(apiUrl(`/admin/driver/approve/${driverId}`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getApprovedDrivers(token) {
  const res = await fetch(apiUrl('/admin/drivers/approved'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ([]))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getTourPlans(token) {
  const res = await fetch(apiUrl('/admin/tour-plans'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ([]))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

// 🚀 NEW FUNCTION ADDED HERE FOR THE USER DASHBOARD
export async function getUserTours(token) {
  const res = await fetch(apiUrl('/tour/user/tours'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ([]))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getDriverTourRequests(token) {
  const res = await fetch(apiUrl('/driver/tour-requests'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ([]))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function approveDriverTourRequest(tourId, token) {
  const res = await fetch(apiUrl(`/driver/tour-requests/${tourId}/approve`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function sendDriverNegotiatedPrice(tourId, driverPrice, token) {
  const res = await fetch(apiUrl(`/driver/tour-requests/${tourId}/negotiate-price`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ driver_price: driverPrice }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getUserNotifications(token) {
  const res = await fetch(apiUrl('/notifications/user'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ([]))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getAdminNotifications(token) {
  const res = await fetch(apiUrl('/notifications/admin'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ([]))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getTourDetails(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/details`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function acceptDriverPrice(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/accept-price`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function rejectDriverPrice(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/reject-price`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function replyToDriver(tourId, message, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/reply`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}
// Driver uses this to send their GPS coordinates
export async function updateDriverLocation(tourId, lat, lng, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/location`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

// User uses this to check where the driver is
export async function getLiveDriverLocation(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/location`), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}
export async function getAllUsers(token) {
  const response = await fetch(apiUrl('/admin/users'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Could not fetch all users')
  return response.json()
}

export async function updateUser(userId, payload, token) {
  const res = await fetch(apiUrl(`/admin/users/${userId}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function deleteUser(userId, token) {
  const res = await fetch(apiUrl(`/admin/users/${userId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getAllDrivers(token) {
  const response = await fetch(apiUrl('/admin/drivers/all'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Could not fetch all drivers')
  return response.json()
}

export async function updateDriverByAdmin(driverId, payload, token) {
  const res = await fetch(apiUrl(`/admin/driver/${driverId}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function cancelTour(tourId, reason, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/cancel`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function deleteTour(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}


export async function getDriverNotifications(token) {
  const res = await fetch(apiUrl('/driver/notifications'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ([]))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function markNotificationRead(id, token) {
  const res = await fetch(apiUrl(`/notifications/${id}/read`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function markAllNotificationsRead(token) {
  const res = await fetch(apiUrl('/notifications/read-all'), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function deleteNotification(id, token) {
  const res = await fetch(apiUrl(`/notifications/${id}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function clearAllNotifications(token) {
  const res = await fetch(apiUrl('/notifications/clear-all'), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function markTourEnRoute(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/en-route`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function markTourArrived(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/arrived`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function startTour(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/start`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function completeTour(tourId, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/complete`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function driverCancelTour(tourId, reason, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/driver-cancel`), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ reason })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function submitFeedback(tourId, rating, comment, token) {
  const res = await fetch(apiUrl(`/tour/${tourId}/feedback`), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ rating, comment })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

// =========================
// ADMIN — FINANCE
// =========================
function financeHeaders(token, json = true) {
  const h = { Authorization: `Bearer ${token}` }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

async function financeJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function getFinanceDashboard(token) {
  const res = await fetch(apiUrl('/admin/finance/dashboard'), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function getFinancePricing(token) {
  const res = await fetch(apiUrl('/admin/finance/pricing'), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function updateFinancePricing(vehicleId, payload, token) {
  const res = await fetch(apiUrl(`/admin/finance/pricing/${vehicleId}`), {
    method: 'PUT',
    headers: financeHeaders(token),
    body: JSON.stringify(payload),
  })
  return financeJson(res)
}

export async function seedFinancePricing(token) {
  const res = await fetch(apiUrl('/admin/finance/pricing/seed'), {
    method: 'POST',
    headers: financeHeaders(token),
  })
  return financeJson(res)
}

export async function getPlatformSettings(token) {
  const res = await fetch(apiUrl('/admin/finance/platform-settings'), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function updatePlatformSettings(payload, token) {
  const res = await fetch(apiUrl('/admin/finance/platform-settings'), {
    method: 'PUT',
    headers: financeHeaders(token),
    body: JSON.stringify(payload),
  })
  return financeJson(res)
}

export async function getCustomerPayments(token, params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(apiUrl(`/admin/finance/customer-payments?${q}`), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function updateCustomerPayment(id, payload, token) {
  const res = await fetch(apiUrl(`/admin/finance/customer-payments/${id}`), {
    method: 'PUT',
    headers: financeHeaders(token),
    body: JSON.stringify(payload),
  })
  return financeJson(res)
}

export async function getDriverPayments(token, params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(apiUrl(`/admin/finance/driver-payments?${q}`), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function updateDriverPayment(id, payload, token) {
  const res = await fetch(apiUrl(`/admin/finance/driver-payments/${id}`), {
    method: 'PUT',
    headers: financeHeaders(token),
    body: JSON.stringify(payload),
  })
  return financeJson(res)
}

export async function getIncomeSummary(token, period = 'monthly') {
  const res = await fetch(apiUrl(`/admin/finance/income/summary?period=${period}`), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function getExpenses(token, params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(apiUrl(`/admin/finance/expenses?${q}`), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function createExpense(formData, token) {
  const res = await fetch(apiUrl('/admin/finance/expenses'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  return financeJson(res)
}

export async function updateExpense(id, formData, token) {
  const res = await fetch(apiUrl(`/admin/finance/expenses/${id}`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  return financeJson(res)
}

export async function deleteExpense(id, token) {
  const res = await fetch(apiUrl(`/admin/finance/expenses/${id}`), {
    method: 'DELETE',
    headers: financeHeaders(token),
  })
  return financeJson(res)
}

export async function getRefunds(token, params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(apiUrl(`/admin/finance/refunds?${q}`), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function createRefund(payload, token) {
  const res = await fetch(apiUrl('/admin/finance/refunds'), {
    method: 'POST',
    headers: financeHeaders(token),
    body: JSON.stringify(payload),
  })
  return financeJson(res)
}

export async function updateRefund(id, payload, token) {
  const res = await fetch(apiUrl(`/admin/finance/refunds/${id}`), {
    method: 'PUT',
    headers: financeHeaders(token),
    body: JSON.stringify(payload),
  })
  return financeJson(res)
}

export async function getFinancialReport(token, params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(apiUrl(`/admin/finance/reports?${q}`), { headers: financeHeaders(token) })
  return financeJson(res)
}

export async function exportFinancialReport(token, params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(apiUrl(`/admin/finance/reports/export?${q}`), { headers: financeHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `HTTP ${res.status}`)
  }
  return res
}

export async function syncFinanceBookings(token) {
  const res = await fetch(apiUrl('/admin/finance/sync-bookings'), {
    method: 'POST',
    headers: financeHeaders(token),
  })
  return financeJson(res)
}
