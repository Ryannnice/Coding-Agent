const AUTH_SESSION_KEY = 'auth_session_v1'
const DEFAULT_BOOTSTRAP_KEY = 'auth_default_bootstrap_v1'

export const DEFAULT_USER = {
  username: 'workshop_guest',
  displayName: '默认用户',
  password: '123456',
}

function safeJsonParse(raw, fallback = null) {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null
  const session = safeJsonParse(localStorage.getItem(AUTH_SESSION_KEY), null)
  if (!session?.username || !session?.token) return null
  return session
}

export function saveCurrentUser(user) {
  if (typeof window === 'undefined') return null
  const session = {
    username: String(user?.username || '').trim(),
    displayName: String(user?.displayName || user?.username || '').trim(),
    token: String(user?.token || '').trim(),
    loggedInAt: user?.loggedInAt || new Date().toISOString(),
  }
  if (!session.username || !session.token) return null
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  localStorage.setItem('isLoggedIn', 'true')
  localStorage.setItem('token', session.token)
  localStorage.setItem('username', session.username)
  return session
}

export function clearCurrentUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_SESSION_KEY)
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('token')
  localStorage.removeItem('username')
}

export function bootstrapDefaultUser() {
  if (typeof window === 'undefined') return null
  const current = getCurrentUser()
  if (current) return current

  const bootstrapped = localStorage.getItem(DEFAULT_BOOTSTRAP_KEY) === 'true'
  if (bootstrapped) return null

  localStorage.setItem(DEFAULT_BOOTSTRAP_KEY, 'true')
  return saveCurrentUser({
    username: DEFAULT_USER.username,
    displayName: DEFAULT_USER.displayName,
    token: `default_${Date.now()}`,
  })
}

export function getUserDisplayName(user) {
  if (!user) return ''
  return user.displayName || user.username || ''
}
