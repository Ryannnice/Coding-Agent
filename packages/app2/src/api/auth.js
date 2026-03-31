import { request } from './client.js'
import { USE_MOCK } from '../config.js'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const MOCK_USER_STORE_KEY = 'mock_auth_users_v1'

function readMockUsers() {
  try {
    const raw = localStorage.getItem(MOCK_USER_STORE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      workshop_guest: { password: '123456', displayName: '默认用户' },
      ...parsed,
    }
  } catch {
    return {
      workshop_guest: { password: '123456', displayName: '默认用户' },
    }
  }
}

function writeMockUsers(users) {
  localStorage.setItem(MOCK_USER_STORE_KEY, JSON.stringify(users))
}

/** Mock 登录：任意用户名密码均成功，返回模拟 token */
async function mockLogin(username, password) {
  await delay(400)
  const users = readMockUsers()
  const user = users[username]
  if (!user || user.password !== password) {
    return {
      ok: false,
      status: 401,
      data: { success: false, message: '用户名或密码错误' },
    }
  }
  return {
    ok: true,
    data: {
      success: true,
      token: `mock_${Date.now()}_${username}`,
      user: {
        username,
        displayName: user.displayName || username,
      },
    },
  }
}

async function mockRegister(username, password, displayName) {
  await delay(400)
  const users = readMockUsers()
  if (users[username]) {
    return {
      ok: false,
      status: 409,
      data: { success: false, message: '用户名已存在' },
    }
  }
  users[username] = {
    password,
    displayName: displayName || username,
  }
  writeMockUsers(users)
  return {
    ok: true,
    data: {
      success: true,
      token: `mock_${Date.now()}_${username}`,
      user: {
        username,
        displayName: displayName || username,
      },
    },
  }
}

/**
 * 登录
 * @param {{ username: string, password: string }} payload
 * @returns {Promise<{ success: boolean, token?: string, message?: string }>}
 */
export async function login(payload) {
  if (USE_MOCK) {
    const res = await mockLogin(payload.username, payload.password)
    if (!res.ok) return res.data
    return res.data
  }
  const { ok, status, data } = await request('/api/auth/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!ok) {
    return {
      success: false,
      message: data?.message || (status === 401 ? '用户名或密码错误' : '登录失败'),
    }
  }
  return data
}

export async function register(payload) {
  if (USE_MOCK) {
    const res = await mockRegister(payload.username, payload.password, payload.displayName)
    return res.data
  }
  const { ok, status, data } = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.username,
      password: payload.password,
      display_name: payload.displayName,
    }),
  })
  if (!ok) {
    return {
      success: false,
      message:
        data?.detail ||
        data?.message ||
        (status === 409 ? '用户名已存在' : '注册失败'),
    }
  }
  return data
}

export async function logout() {
  if (USE_MOCK) return { success: true }
  const { data } = await request('/api/auth/sessions/current', {
    method: 'DELETE',
  })
  return data || { success: true }
}
