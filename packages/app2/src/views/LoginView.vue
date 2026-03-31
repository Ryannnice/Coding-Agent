<template>
  <div class="login-page">
    <div class="login-bg-pattern" />
    <div
      class="login-card"
      v-motion
      :initial="{ opacity: 0, y: 40 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }"
    >
      <div class="mode-switch">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >
          登录
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >
          注册
        </button>
      </div>

      <h1 class="login-title">{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h1>
      <p class="login-subtitle">
        {{ mode === 'login' ? '登录后即可按用户保存 Workshop 对话记录' : '注册后将自动登录，并拥有独立的 Workshop 对话记录' }}
      </p>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div v-if="mode === 'register'" class="form-group">
          <label for="displayName">显示名称</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="请输入显示名称"
          />
        </div>
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            :placeholder="mode === 'register' ? '至少 6 位密码' : '请输入密码'"
            required
          />
        </div>
        <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? (mode === 'login' ? '登录中…' : '注册中…') : (mode === 'login' ? '登录' : '注册并登录') }}
        </button>
      </form>

      <p class="default-tip">
        默认账户：{{ DEFAULT_USER.username }} / {{ DEFAULT_USER.password }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, register } from '../api/auth.js'
import { DEFAULT_USER, saveCurrentUser } from '../utils/auth.js'

const router = useRouter()
const mode = ref('login')
const displayName = ref('')
const username = ref(DEFAULT_USER.username)
const password = ref(DEFAULT_USER.password)
const loading = ref(false)
const errorMsg = ref('')

function switchMode(nextMode) {
  mode.value = nextMode
  errorMsg.value = ''
  if (nextMode === 'login') {
    username.value = DEFAULT_USER.username
    password.value = DEFAULT_USER.password
    displayName.value = ''
  } else {
    username.value = ''
    password.value = ''
    displayName.value = ''
  }
}

function completeAuth(res, fallbackUsername, fallbackDisplayName) {
  saveCurrentUser({
    username: res.user?.username || fallbackUsername,
    displayName: res.user?.displayName || fallbackDisplayName || fallbackUsername,
    token: res.token,
  })
  router.push('/')
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!username.value.trim()) {
    errorMsg.value = '用户名不能为空'
    return
  }
  if (!password.value) {
    errorMsg.value = '密码不能为空'
    return
  }
  if (mode.value === 'register' && password.value.length < 6) {
    errorMsg.value = '密码至少需要 6 位'
    return
  }
  loading.value = true
  try {
    if (mode.value === 'login') {
      const res = await login({ username: username.value.trim(), password: password.value })
      if (res.success && res.token) {
        completeAuth(res, username.value.trim(), username.value.trim())
      } else {
        errorMsg.value = res.message || '登录失败'
      }
    } else {
      const normalizedDisplayName = displayName.value.trim() || username.value.trim()
      const res = await register({
        username: username.value.trim(),
        password: password.value,
        displayName: normalizedDisplayName,
      })
      if (res.success && res.token) {
        completeAuth(res, username.value.trim(), normalizedDisplayName)
      } else {
        errorMsg.value = res.message || '注册失败'
      }
    }
  } catch (e) {
    errorMsg.value = e?.message || '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.login-bg-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(99, 102, 241, 0.08), transparent);
  pointer-events: none;
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 48px 40px;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}

.mode-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
}

.mode-btn {
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.mode-btn.active {
  background: rgba(99, 102, 241, 0.18);
  color: #fff;
}

.login-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 32px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input {
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-group input::placeholder {
  color: var(--text-muted);
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.login-btn {
  margin-top: 8px;
  padding: 16px 24px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.login-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.login-btn:active {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.login-error {
  margin: 0;
  padding: 10px 0;
  font-size: 0.9rem;
  color: var(--accent);
}

.default-tip {
  margin: 18px 0 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
