const STORAGE_KEY = 'workshop_conversations_v1'

function safeJsonParse(raw, fallback) {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function readStore() {
  if (typeof window === 'undefined') return {}
  return safeJsonParse(localStorage.getItem(STORAGE_KEY), {})
}

function writeStore(store) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createConversationId() {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyConversation(title = '新对话') {
  const now = new Date().toISOString()
  return {
    id: createConversationId(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
    preview: {
      mode: 'empty',
      html: '',
      url: '',
      code: { lang: '', content: '' },
    },
  }
}

export function getWorkshopState(username) {
  if (!username) return { conversations: [], currentConversationId: '' }
  const store = readStore()
  const userState = store[username]
  if (!userState) return { conversations: [], currentConversationId: '' }
  return {
    conversations: Array.isArray(userState.conversations) ? clone(userState.conversations) : [],
    currentConversationId: String(userState.currentConversationId || ''),
  }
}

export function saveWorkshopState(username, state) {
  if (!username) return
  const store = readStore()
  store[username] = {
    conversations: clone(Array.isArray(state?.conversations) ? state.conversations : []),
    currentConversationId: String(state?.currentConversationId || ''),
  }
  writeStore(store)
}
