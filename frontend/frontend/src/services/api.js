const DEFAULT_API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:5001'

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_API}${p}`
}

export function getApiBaseUrl() {
  return DEFAULT_API
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