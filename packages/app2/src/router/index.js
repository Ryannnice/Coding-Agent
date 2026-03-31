import { createRouter, createWebHistory } from 'vue-router'
import { login } from '../api/auth.js'
import { clearCurrentUser, DEFAULT_USER, getCurrentUser, saveCurrentUser } from '../utils/auth.js'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/home',
    redirect: '/',
  },
  {
    path: '/channel',
    name: 'Channel',
    component: () => import('../views/ChannelView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/workshop',
    name: 'Workshop',
    component: () => import('../views/WorkshopView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/news/:newsId',
    name: 'NewsDetail',
    component: () => import('../views/NewsDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/brief/:newsId',
    name: 'NewsBrief',
    component: () => import('../views/NewsBriefView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let defaultLoginPromise = null

async function ensureDefaultUser() {
  if (!defaultLoginPromise) {
    // 先写入一个本地默认会话，避免后端暂时不可用时整站被强制踢到登录页
    const existing = getCurrentUser()
    if (!existing) {
      saveCurrentUser({
        username: DEFAULT_USER.username,
        displayName: DEFAULT_USER.displayName,
        token: `default_local_${Date.now()}`,
      })
    }

    defaultLoginPromise = login({
      username: DEFAULT_USER.username,
      password: DEFAULT_USER.password,
    })
      .then((res) => {
        if (res.success && res.token) {
          saveCurrentUser({
            username: res.user?.username || DEFAULT_USER.username,
            displayName: res.user?.displayName || DEFAULT_USER.displayName,
            token: res.token,
          })
          return true
        }
        return !!getCurrentUser()
      })
      .catch(() => {
        return !!getCurrentUser()
      })
      .finally(() => {
        defaultLoginPromise = null
      })
  }
  return defaultLoginPromise
}

router.beforeEach(async (to) => {
  let user = getCurrentUser()
  if (!user && to.meta.requiresAuth) {
    const ok = await ensureDefaultUser()
    if (ok) user = getCurrentUser()
  }

  if (to.name === 'Login' && user) {
    return '/'
  }

  if (to.meta.requiresAuth && !user) {
    return '/login'
  }

  return true
})

export default router
