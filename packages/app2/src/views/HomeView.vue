<template>
  <div class="home-page">
    <div class="home-bg" />
    <div class="account-bar">
      <div class="account-chip">
        <span class="account-label">当前用户</span>
        <strong>{{ userName }}</strong>
      </div>
      <button type="button" class="account-logout" @click="logout">退出登录</button>
    </div>
    
    <!-- 三卡片循环布局：左、中、右三个槽位，点击卡片触发循环 -->
    <div class="home-layout">
      <!-- 左槽位 -->
      <div
        class="card slot-left"
        :class="slotClass(leftCard)"
        v-motion
        :initial="{ opacity: 0, x: -30 }"
        :enter="{ opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.2 } }"
        @click="rotateOnClick('left')"
      >
        <Transition name="card-fade" mode="out-in">
          <slot-content :key="'left-' + leftCard" :card="leftCard" @navigate="handleSlotNavigate" />
        </Transition>
      </div>

      <!-- 中槽位（突出显示） -->
      <div
        class="card slot-center"
        :class="slotClass(centerCard)"
        v-motion
        :initial="{ opacity: 0, y: -20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } }"
        @click="rotateOnClick('center')"
      >
        <Transition name="card-fade" mode="out-in">
          <slot-content :key="'center-' + centerCard" :card="centerCard" @navigate="handleSlotNavigate" />
        </Transition>
      </div>

      <!-- 右槽位 -->
      <div
        class="card slot-right"
        :class="slotClass(rightCard)"
        v-motion
        :initial="{ opacity: 0, x: 30 }"
        :enter="{ opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.3 } }"
        @click="rotateOnClick('right')"
      >
        <Transition name="card-fade" mode="out-in">
          <slot-content :key="'right-' + rightCard" :card="rightCard" @navigate="handleSlotNavigate" />
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { logout as logoutApi } from '../api/auth.js'
import SlotContent from '../components/HomeSlotContent.vue'
import { getOpenMAICAppUrl } from '../config.js'
import { clearCurrentUser, getCurrentUser, getUserDisplayName } from '../utils/auth.js'

const router = useRouter()
const currentUser = getCurrentUser()

// 顺序 [左, 中, 右]，初始：Channel左, Workshop中, OpenMAIC右
const order = ref(['channel', 'workshop', 'remain'])
const isAnimating = ref(false)
const ROTATE_DELAY = 60
const TRANSITION_DURATION = 320
const userName = computed(() => getUserDisplayName(currentUser) || '未登录')

const leftCard = computed(() => order.value[0])
const centerCard = computed(() => order.value[1])
const rightCard = computed(() => order.value[2])

function slotClass(card) {
  return {
    'is-channel': card === 'channel',
    'is-workshop': card === 'workshop',
    'is-remain': card === 'remain'
  }
}

function rotateOnClick(slot) {
  if (isAnimating.value) return
  isAnimating.value = true
  
  const [left, center, right] = order.value
  let newOrder
  // 点击左：左→中，中→右，右→左 => 新[右,左,中]
  if (slot === 'left') {
    newOrder = [right, left, center]
  // 点击中：中→左，左→右，右→中 => 新[中,右,左]
  } else if (slot === 'center') {
    newOrder = [center, right, left]
  // 点击右：右→中，中→左，左→右 => 新[中,右,左]
  } else {
    newOrder = [center, right, left]
  }
  
  setTimeout(() => {
    order.value = newOrder
    setTimeout(() => { isAnimating.value = false }, TRANSITION_DURATION)
  }, ROTATE_DELAY)
}

function handleSlotNavigate(card) {
  if (card === 'channel') {
    router.push('/channel')
    return
  }
  if (card === 'workshop') {
    router.push('/workshop')
    return
  }
  if (card === 'remain') {
    // 直接整页跳转，保证 session history 为「主页 → OpenMAIC」，避免 router+replace 竞态弄丢主页
    window.location.assign(getOpenMAICAppUrl())
  }
}

async function logout() {
  await logoutApi().catch(() => null)
  clearCurrentUser()
  router.push('/login')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
}

.account-bar {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
}

.account-chip {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
}

.account-label {
  color: var(--text-secondary);
}

.account-logout {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.account-logout:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.home-bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99, 102, 241, 0.08), transparent 60%);
  pointer-events: none;
}

.home-layout {
  position: relative;
  width: 100%;
  max-width: 1000px;
  min-height: 480px;
  height: 55vh;
}

/* 三个固定槽位：位置大小不变 */
/* 内容切换淡入淡出 - 流畅过渡 */
.card-fade-enter-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;
}
.card-fade-enter-to,
.card-fade-leave-from {
  opacity: 1;
}

.slot-left {
  position: absolute;
  left: 0;
  top: 18%;
  bottom: 18%;
  width: 28%;
  min-width: 180px;
  z-index: 1;
}

.slot-center {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: 44%;
  z-index: 2;
}

.slot-right {
  position: absolute;
  right: 0;
  top: 18%;
  bottom: 18%;
  width: 28%;
  min-width: 180px;
  z-index: 1;
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-soft);
  padding: 32px;
  cursor: pointer;
  transition: box-shadow var(--transition-smooth), background var(--transition-smooth), transform var(--transition-smooth);
}

.card:hover {
  background: var(--bg-card-hover);
  box-shadow: var(--shadow-hover);
  transform: scale(1.02);
}

.is-channel:hover {
  border-color: rgba(99, 102, 241, 0.4);
  transform: scale(1.03);
}

.card-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.card-desc {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .account-bar {
    top: 16px;
    right: 16px;
    left: 16px;
    justify-content: space-between;
  }

  .home-layout {
    height: auto;
    min-height: 520px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .slot-left,
  .slot-center,
  .slot-right {
    position: relative;
    width: 100%;
    min-width: unset;
    height: auto;
    min-height: 140px;
    top: auto;
    bottom: auto;
    left: auto;
    right: auto;
  }
}
</style>
