<template>
  <div class="channel-page">
    <div class="channel-header">
      <router-link to="/" class="back-link">← 返回主页</router-link>
      <div class="title-group">
        <template v-if="isMainRanking">
          <div class="title-row">
            <h1 class="page-title title-main" @click="switchToMain">商业 · 行业</h1>
            <span class="page-title title-sub sub-badge" @click="switchToSub">开发者 · 技术</span>
          </div>
        </template>
        <template v-else>
          <div class="title-row">
            <h1 class="page-title title-main" @click="switchToSub">开发者 · 技术</h1>
            <span class="page-title title-sub sub-badge" @click="switchToMain">商业 · 行业</span>
          </div>
        </template>
      </div>
    </div>

    <div class="leaderboard-nav">
      <span class="nav-arrows">‹ ›</span>
    </div>

    <div v-if="loadError" class="load-error">
      <p>{{ loadError }}</p>
      <button type="button" class="retry-btn" @click="fetchAll">重试</button>
    </div>
    <div v-else-if="actionMessage" class="action-message">
      {{ actionMessage }}
    </div>
    <div v-else-if="loading" class="load-state">加载中…</div>
    <div v-else class="leaderboard-content" :class="{ 'is-sub': !isMainRanking }">
      <!-- 主频道：创意精选（左）+ 企业新榜（右） -->
      <template v-if="isMainRanking">
        <div class="side-column leaderboard-col video-column">
          <h3 class="column-title">创意精选</h3>
          <div
            v-for="(item, index) in leftData"
            :key="item.id"
            class="leaderboard-item"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.05 } }"
          >
            <div class="item-content">
              <p class="item-title" @click="openNewsUrl(item)">{{ item.title }}</p>
              <div
                class="video-placeholder"
                role="button"
                tabindex="0"
                @click="openNewsUrl(item)"
                @keydown.enter.prevent="openNewsUrl(item)"
                @keydown.space.prevent="openNewsUrl(item)"
              >
                <div v-if="item.coverUrl" class="video-cover video-cover--thumb">
                  <img
                    class="cover-image"
                    :src="item.coverUrl"
                    :alt="item.title"
                    loading="lazy"
                    @error="onCoverError(item)"
                    @load="onCoverLoad($event, item)"
                  />
                  <div class="cover-overlay" />
                </div>
                <div v-else class="video-cover">
                  <span class="video-label">暂无封面</span>
                </div>
              </div>
            </div>
            <div class="item-meta">
              <span class="item-rank" :class="{ 'rank-top': item.id <= 3 }">#{{ item.id }}</span>
            </div>
          </div>
          <button
            v-if="mainPool.length"
            type="button"
            class="load-more-btn"
            @click="loadMoreVideos"
          >
            随机加载更多
          </button>
        </div>

        <div class="side-column leaderboard-col weibo-column">
          <h3 class="column-title">商业 · 行业</h3>
          <div
            v-for="(item, index) in leftmostData"
            :key="'leftmost-' + item.id"
            class="weibo-rank-item"
            @click="openNewsUrl(item)"
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 0.4, delay: (index + 3) * 0.05 } }"
          >
            <span class="weibo-rank-num" :class="{ 'rank-top3': item.id <= 3 }">{{ item.id }}</span>
            <div class="weibo-rank-content">
              <span class="weibo-rank-title">{{ item.title }}</span>
            </div>
            <div class="rank-actions" @click.stop>
              <button
                type="button"
                class="rank-action-btn rank-action-summary"
                @click="summaryNews(item)"
                :disabled="!item?.newsId"
              >
                概述
              </button>
              <button
                type="button"
                class="rank-action-btn rank-action-explain"
                @click="explainNews(item)"
                :disabled="explainLoading"
              >
                {{ explainLoading ? '生成中…' : '讲解' }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 副频道：技能提升（左）+ 个人新榜（右） -->
      <template v-else>
        <div class="side-column leaderboard-col video-column">
          <h3 class="column-title">技能提升</h3>
          <div
            v-for="(item, index) in rightData"
            :key="item.id"
            class="leaderboard-item"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.05 } }"
          >
            <div class="item-content">
              <p class="item-title" @click="openNewsUrl(item)">{{ item.title }}</p>
              <div
                class="video-placeholder"
                role="button"
                tabindex="0"
                @click="openNewsUrl(item)"
                @keydown.enter.prevent="openNewsUrl(item)"
                @keydown.space.prevent="openNewsUrl(item)"
              >
                <div v-if="item.coverUrl" class="video-cover video-cover--thumb">
                  <img
                    class="cover-image"
                    :src="item.coverUrl"
                    :alt="item.title"
                    loading="lazy"
                    @error="onCoverError(item)"
                    @load="onCoverLoad($event, item)"
                  />
                  <div class="cover-overlay" />
                </div>
                <div v-else class="video-cover">
                  <span class="video-label">暂无封面</span>
                </div>
              </div>
            </div>
            <div class="item-meta">
              <span class="item-rank" :class="{ 'rank-top': item.id <= 3 }">#{{ item.id }}</span>
            </div>
          </div>
          <button
            v-if="subPool.length"
            type="button"
            class="load-more-btn"
            @click="loadMoreVideos"
          >
            随机加载更多
          </button>
        </div>

        <div class="side-column leaderboard-col weibo-column">
          <h3 class="column-title">开发者 · 技术</h3>
          <div
            v-for="(item, index) in rightmostData"
            :key="'rightmost-' + item.id"
            class="weibo-rank-item"
            @click="openNewsUrl(item)"
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 0.4, delay: (index + 3) * 0.05 } }"
          >
            <span class="weibo-rank-num" :class="{ 'rank-top3': item.id <= 3 }">{{ item.id }}</span>
            <div class="weibo-rank-content">
              <span class="weibo-rank-title">{{ item.title }}</span>
            </div>
            <div class="rank-actions" @click.stop>
              <button
                type="button"
                class="rank-action-btn rank-action-summary"
                @click="summaryNews(item)"
                :disabled="!item?.newsId"
              >
                概述
              </button>
              <button
                type="button"
                class="rank-action-btn rank-action-explain"
                @click="explainNews(item)"
                :disabled="explainLoading"
              >
                {{ explainLoading ? '生成中…' : '讲解' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRankWeibo } from '../api/rank.js'
import { getOpenMAICAppUrl, buildOpenMAICDialogPrefillHomeUrl } from '../config.js'

const router = useRouter()

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const isMainRanking = ref(false)
const leftData = ref([])
const rightData = ref([])
const leftmostData = ref([])
const rightmostData = ref([])
const loading = ref(true)
const loadError = ref('')
const actionMessage = ref('')
const LEFT_NEWS_COUNT = 10
const LOAD_MORE_COUNT = 5
const FALLBACK_COVER = '/favicon.svg'
const DEFAULT_COVER_POOL = [
  '/channel-covers/creative-rank-1.png',
  '/channel-covers/creative-rank-2.png',
  '/channel-covers/creative-rank-3.png',
  '/channel-covers/creative-rank-4.png',
  '/channel-covers/creative-rank-5.png',
  '/channel-covers/skill-rank-1.png',
  '/channel-covers/skill-rank-2.png',
  '/channel-covers/skill-rank-3.png',
  '/channel-covers/skill-rank-4.png',
  '/channel-covers/skill-rank-5.png',
]

function shuffleArray(list) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function formatWan(viewsNum) {
  const n = Number(viewsNum)
  if (!Number.isFinite(n)) return String(viewsNum ?? '')
  if (n >= 10000) {
    const wan = n / 10000
    const s = wan.toFixed(1).replace(/\.0$/, '')
    return `${s}万`
  }
  return String(n)
}

function pickDefaultCover(item) {
  const id = Math.max(1, Number(item?.id || 1))
  return DEFAULT_COVER_POOL[(id - 1) % DEFAULT_COVER_POOL.length] || FALLBACK_COVER
}

function buildCoverCandidates(item, fallbackCover) {
  const candidates = []
  if (item?.coverUrl) candidates.push(String(item.coverUrl))
  candidates.push(fallbackCover || FALLBACK_COVER)
  return [...new Set(candidates.filter(Boolean))]
}

function mapNewsForLeft(item) {
  const fallbackCover = pickDefaultCover(item)
  const coverCandidates = buildCoverCandidates(item, fallbackCover)
  return {
    ...item,
    fallbackCover,
    coverCandidates,
    coverCandidateIndex: 0,
    coverUrl: coverCandidates[0] || fallbackCover,
    coverCheckDone: false,
    viewsText: item?.viewsText || `${formatWan(item?.viewsNum)} 热度`,
  }
}

function moveToNextCover(item) {
  if (!item) return
  const list = Array.isArray(item.coverCandidates) ? item.coverCandidates : []
  if (!list.length) {
    item.coverUrl = item.fallbackCover || FALLBACK_COVER
    item.coverCheckDone = true
    return
  }
  const cur = Number(item.coverCandidateIndex || 0)
  const next = Math.min(cur + 1, list.length - 1)
  item.coverCandidateIndex = next
  item.coverUrl = list[next]
  item.coverCheckDone = false
}

function onCoverError(item) {
  if (!item) return
  const retries = Number(item._coverRetries || 0)
  if (retries < 2 && item.coverUrl && !item.coverUrl.startsWith('/')) {
    item._coverRetries = retries + 1
    const sep = item.coverUrl.includes('?') ? '&' : '?'
    item.coverUrl = item.coverUrl.replace(/[?&]_r=\d+/, '') + `${sep}_r=${retries + 1}`
    return
  }
  item._coverRetries = 0
  moveToNextCover(item)
}

function onCoverLoad(_event, item) {
  if (!item || item.coverCheckDone) return
  item._coverRetries = 0
  item.coverCheckDone = true
}

function openNews(item) {
  const newsId = item?.newsId
  if (newsId) {
    const idStr = String(newsId).trim()
    if (/^[0-9]+$/.test(idStr)) {
      router.push(`/brief/${encodeURIComponent(idStr)}`)
      return
    }
    const news = getNewsById(newsId)
    if (news) {
      router.push(`/news/${encodeURIComponent(newsId)}`)
      return
    }
  }
  const url = item?.url
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

function openNewsUrl(item) {
  const url = item?.url
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  openNews(item)
}

function summaryNews(item) {
  const newsId = item?.newsId
  if (!newsId) return
  const idStr = String(newsId).trim()
  if (/^[0-9]+$/.test(idStr)) {
    router.push(`/brief/${encodeURIComponent(idStr)}`)
  } else {
    actionMessage.value = '该条新闻暂不支持概述'
    setTimeout(() => { actionMessage.value = '' }, 2000)
  }
}

const mainPool = ref([])
const subPool = ref([])

function loadMoreVideos() {
  if (isMainRanking.value) {
    const pool = mainPool.value
    if (!pool.length) return
    const batch = pool.splice(0, LOAD_MORE_COUNT)
    const startId = leftData.value.length + 1
    leftData.value.push(
      ...batch.map((item, i) => mapNewsForLeft({ ...item, id: startId + i })),
    )
  } else {
    const pool = subPool.value
    if (!pool.length) return
    const batch = pool.splice(0, LOAD_MORE_COUNT)
    const startId = rightData.value.length + 1
    rightData.value.push(
      ...batch.map((item, i) => mapNewsForLeft({ ...item, id: startId + i })),
    )
  }
}

const explainLoading = ref(false)
const explainError = ref('')
const classroomUrl = ref('')

async function explainNews(item) {
  const title = item?.title
  if (!title) return

  // 整页跳转必须直接访问 OpenMAIC（不能走 Nginx 代理，否则 302 重定向路径会错）
  const appUrl = getOpenMAICAppUrl()

  explainLoading.value = true
  explainError.value = ''
  classroomUrl.value = ''
  actionMessage.value = `正在通过 OpenMAIC 预填讲解「${title}」…`

  try {
    const url = buildOpenMAICDialogPrefillHomeUrl(appUrl, title)
    await sleep(200)
    window.location.href = url
  } catch (e) {
    explainError.value = e instanceof Error ? e.message : String(e)
    actionMessage.value = `跳转失败：${explainError.value}`
    setTimeout(() => {
      actionMessage.value = ''
    }, 5000)
  } finally {
    explainLoading.value = false
  }
}

function switchToMain() {
  isMainRanking.value = true
}

function switchToSub() {
  isMainRanking.value = false
}

async function fetchAll() {
  loading.value = true
  loadError.value = ''
  try {
    const [mainWeibo, subWeibo] = await Promise.all([
      getRankWeibo('main'),
      getRankWeibo('sub'),
    ])
    const shuffledMain = shuffleArray(mainWeibo.list || [])
    const mainLeftItems = shuffledMain.slice(0, LEFT_NEWS_COUNT)
    leftData.value = mainLeftItems.map((item) => mapNewsForLeft(item))
    mainPool.value = shuffledMain.slice(LEFT_NEWS_COUNT)
    leftmostData.value = mainWeibo.list || []

    const shuffledSub = shuffleArray(subWeibo.list || [])
    const subLeftItems = shuffledSub.slice(0, LEFT_NEWS_COUNT)
    rightData.value = subLeftItems.map((item) => mapNewsForLeft(item))
    subPool.value = shuffledSub.slice(LEFT_NEWS_COUNT)
    rightmostData.value = subWeibo.list || []
  } catch (e) {
    loadError.value = e.message || '加载排行榜失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.channel-page {
  min-height: 100vh;
  padding: 32px 24px;
}

.channel-header {
  max-width: 1400px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.back-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color var(--transition-fast);
  flex-shrink: 0;
}

.back-link:hover {
  color: var(--accent);
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.title-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 16px;
  position: relative;
}

.page-title {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0;
  cursor: pointer;
  transition: color var(--transition-fast), font-size var(--transition-fast);
}

.page-title.title-main {
  font-size: 1.75rem;
  color: var(--text-primary);
}

.page-title.title-sub {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-left: auto;
  padding-bottom: 4px;
}

.page-title.sub-badge:hover {
  color: var(--accent);
}

.page-title.title-main:hover {
  color: var(--accent);
}

.leaderboard-nav {
  max-width: 1400px;
  margin: 0 auto 24px;
  display: flex;
  justify-content: center;
}

.nav-arrows {
  font-size: 1.25rem;
  color: var(--text-muted);
  letter-spacing: 0.5em;
}

.load-error,
.load-state {
  max-width: 1400px;
  margin: 0 auto;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.load-error p {
  margin: 0 0 16px;
}

.retry-btn {
  padding: 10px 20px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  cursor: pointer;
}

.retry-btn:hover {
  background: var(--accent-hover);
}

.leaderboard-content {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2.2fr 0.7fr;
  gap: 20px;
  align-items: start;
}

.leaderboard-col {
  min-width: 0;
}

.video-column {
  min-width: 0;
}

.column-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 16px;
  padding-left: 4px;
}

.side-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.leaderboard-item {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  transition: box-shadow var(--transition-fast);
}

.leaderboard-item:hover {
  box-shadow: var(--shadow-card);
}

.item-content {
  padding: 24px;
}

.item-title {
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 16px;
  cursor: pointer;
}

.video-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
}

.video-cover {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05));
}

.video-cover--thumb {
  position: relative;
  padding: 0;
  gap: 0;
  background: #0f1117;
  overflow: hidden;
}

.cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.05) 0%,
    rgba(0, 0, 0, 0.35) 100%
  );
  pointer-events: none;
}

.video-cover--thumb .play-icon,
.video-cover--thumb .video-label {
  position: relative;
  z-index: 1;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.65);
}

.play-icon {
  font-size: 2.5rem;
  color: var(--accent);
  opacity: 0.9;
}

.video-label {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.item-meta {
  padding: 16px 24px;
  border-top: 1px solid var(--bg-glass-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.item-rank {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-muted);
}

.item-rank.rank-top {
  color: var(--accent);
}

.item-views {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* 微博热搜风格 */
.weibo-column {
  gap: 10px;
}

.weibo-rank-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-lg);
  transition: background var(--transition-fast);
  cursor: pointer;
}

.weibo-rank-item:hover {
  background: var(--bg-card-hover);
}

.rank-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 10px;
  flex-shrink: 0;
}

.rank-action-btn {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--bg-glass-border);
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.rank-action-btn:hover {
  background: rgba(99, 102, 241, 0.14);
  border-color: rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}

.rank-action-summary {
  background: rgba(34, 197, 94, 0.12);
  color: var(--text-primary);
}

.rank-action-explain {
  background: rgba(99, 102, 241, 0.12);
  color: var(--text-primary);
}

.rank-action-explain:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.action-message {
  max-width: 1400px;
  margin: 0 auto 24px;
  padding: 12px 16px;
  text-align: center;
  color: var(--text-primary);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-lg);
  background: rgba(99, 102, 241, 0.1);
}

.weibo-rank-num {
  flex-shrink: 0;
  width: 24px;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: #f97316;
  line-height: 1.4;
}

.weibo-rank-num.rank-top3 {
  color: #ef4444;
}

.weibo-rank-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weibo-rank-title {
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.45;
}

.weibo-rank-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weibo-rank-count {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.weibo-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.weibo-tag.tag-热 {
  background: #ef4444;
  color: white;
}

.weibo-tag.tag-新 {
  background: #ef4444;
  color: white;
}

.weibo-tag.tag-重磅 {
  background: #64748b;
  color: white;
}

.weibo-tag.tag-首发 {
  background: #38bdf8;
  color: white;
}

.weibo-tag.tag-速览 {
  background: #f59e0b;
  color: white;
}

.weibo-tag.tag-AI {
  background: #8b5cf6;
  color: white;
}

.load-more-btn {
  width: 100%;
  padding: 14px 0;
  background: rgba(99, 102, 241, 0.1);
  color: var(--text-primary);
  border: 1px dashed rgba(99, 102, 241, 0.35);
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast),
    transform var(--transition-fast);
}

.load-more-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.6);
  transform: translateY(-1px);
}

.load-more-btn:active {
  transform: translateY(0);
}

/* 响应式 */
@media (max-width: 1200px) {
  .leaderboard-content {
    grid-template-columns: 1.6fr 0.8fr;
  }
}

@media (max-width: 768px) {
  .leaderboard-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .title-row {
    flex-wrap: wrap;
  }

  .page-title.title-sub {
    margin-left: 0;
    padding-bottom: 0;
  }
}
</style>
