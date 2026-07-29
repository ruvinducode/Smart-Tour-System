import { useCallback, useState } from 'react'

function getRoleFromToken(token) {
  if (!token) return ''
  try {
    const payload = token.split('.')[1]
    if (!payload) return ''
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized))
    return decoded.role || ''
  } catch {
    return ''
  }
}

export default function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('smart_tour_token') || '')
  const [userName, setUserName] = useState(() => localStorage.getItem('smart_tour_name') || '')
  const [userRole, setUserRole] = useState(() => {
    const storedRole = localStorage.getItem('smart_tour_role') || ''
    if (storedRole) return storedRole
    const storedToken = localStorage.getItem('smart_tour_token') || ''
    return getRoleFromToken(storedToken)
  })

  const persistSession = useCallback((nextToken, nextName, nextRole = '') => {
    const resolvedRole = nextRole || getRoleFromToken(nextToken)

    setToken(nextToken)
    setUserName(nextName || '')
    setUserRole(resolvedRole)

    if (nextToken) localStorage.setItem('smart_tour_token', nextToken)
    else localStorage.removeItem('smart_tour_token')

    if (nextName) localStorage.setItem('smart_tour_name', nextName)
    else localStorage.removeItem('smart_tour_name')

    if (resolvedRole) localStorage.setItem('smart_tour_role', resolvedRole)
    else localStorage.removeItem('smart_tour_role')
  }, [])

  const logout = useCallback(() => {
    persistSession('', '', '')
  }, [persistSession])

  return {
    token,
    userName,
    userRole,
    loggedIn: Boolean(token),
    persistSession,
    logout,
  }
}
