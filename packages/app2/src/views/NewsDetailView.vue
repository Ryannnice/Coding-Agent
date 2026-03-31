<template>
  <div class="news-page">
    <div class="news-header">
      <router-link to="/channel" class="back-link">← 返回频道排行榜</router-link>
    </div>

    <div v-if="loading" class="load-state">加载中…</div>
    <div v-else-if="!news" class="load-error">
      <p>未找到该新闻（newsId：{{ routeNewsId }}）</p>
    </div>
    <div v-else class="news-content">
      <div class="news-top">
        <h1 class="news-title">{{ news.title }}</h1>
        <div class="news-meta">
          <span v-if="news.source" class="news-source">{{ news.source }}</span>
          <a :href="news.url" class="news-original" target="_blank" rel="noreferrer noopener">
            打开原网页
          </a>
        </div>

        <div class="news-actions">
          <button
            type="button"
            class="news-action-btn news-action-summary"
            @click="goToSummary"
          >
            概述
          </button>

          <button
            type="button"
            class="news-action-btn news-action-explain"
            :disabled="explainLoading || !openmaicBaseUrl"
            @click="runExplain"
          >
            {{ explainLoading ? 'OpenMAIC 生成中…' : '让 OpenMAIC 给我讲解' }}
          </button>
        </div>
      </div>

      <div class="news-text-wrap">
        <pre class="news-text">{{ news.text }}</pre>
      </div>

      <div v-if="explainError" class="explain-error">{{ explainError }}</div>
      <div v-if="explainStatus" class="explain-status">
        <div class="explain-row">
          <span>进度：</span>
          <strong>{{ explainStatus.message || '处理中…' }}</strong>
        </div>
        <div v-if="typeof explainStatus.progress === 'number'" class="explain-row">
          <span>完成度：</span>
          <strong>{{ explainStatus.progress }}%</strong>
        </div>
      </div>

      <div v-if="classroomUrl" class="classroom-link">
        <span>课堂已生成：</span>
        <a :href="classroomUrl" target="_blank" rel="noreferrer noopener">{{ classroomUrl }}</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { OPENMAIC_BASE_URL } from '../config.js'
import { getNewsById } from '../mock/news.js'

const route = useRoute()
const router = useRouter()
const routeNewsId = computed(() => route.params.newsId)
const newsId = computed(() => String(route.params.newsId || ''))
const explainAuto = computed(() => route.query.explain === '1')

const loading = ref(true)
const news = ref(null)

const openmaicBaseUrl = OPENMAIC_BASE_URL

const explainLoading = ref(false)
const explainError = ref('')
const explainStatus = ref(null)
const classroomUrl = ref('')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function buildRequirement(n) {
  return `请用中文给我讲解：${n.title}`
}

async function runExplain() {
  if (explainLoading.value) return
  if (!openmaicBaseUrl) {
    explainError.value = '未配置 OpenMAIC 服务：请设置环境变量 `VITE_OPENMAIC_BASE_URL`'
    return
  }
  if (!news.value) return

  explainLoading.value = true
  explainError.value = ''
  explainStatus.value = null
  classroomUrl.value = ''

  try {
    const title = news.value.title
    const requirement = buildRequirement(news.value)

    const createRes = await fetch(`${openmaicBaseUrl}/api/generate-classroom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement, language: 'zh-CN' }),
    })

    const createJson = await createRes.json().catch(() => null)
    if (!createRes.ok || !createJson?.success) {
      const msg = createJson?.error || createJson?.message || `OpenMAIC 创建任务失败（HTTP ${createRes.status}）`
      throw new Error(msg)
    }

    const jobId = createJson.jobId
    // 始终使用相对路径通过 Nginx 代理访问，确保路径正确
    const pollUrl = `${openmaicBaseUrl}/api/generate-classroom/${jobId}`
    let intervalMs = createJson.pollIntervalMs ?? 5000
    intervalMs = Math.max(2000, Math.min(8000, Number(intervalMs)))

    const maxTries = 20
    for (let i = 0; i < maxTries; i++) {
      await sleep(intervalMs)

      const pollRes = await fetch(pollUrl)
      const pollJson = await pollRes.json().catch(() => null)

      if (!pollRes.ok || !pollJson?.success) {
        const msg = pollJson?.error || pollJson?.message || `OpenMAIC 轮询失败（HTTP ${pollRes.status}）`
        throw new Error(msg)
      }

      explainStatus.value = {
        message: pollJson.message,
        progress: pollJson.progress,
      }

      if (pollJson.done) {
        if (pollJson.error) {
          throw new Error(pollJson.error)
        }
        const url = pollJson.result?.url
        if (url) {
          const urlWithPrefill = `${url}${url.includes('?') ? '&' : '?'}prefill=${encodeURIComponent(
            title,
          )}`
          classroomUrl.value = urlWithPrefill
          window.open(urlWithPrefill, '_blank', 'noopener,noreferrer')
        } else {
          explainError.value = '课堂生成完成，但未返回 classroom URL'
        }
        break
      }
    }
  } catch (e) {
    explainError.value = e instanceof Error ? e.message : String(e)
  } finally {
    explainLoading.value = false
  }
}

function goToSummary() {
  const id = newsId.value
  if (/^[0-9]+$/.test(id)) {
    router.push(`/brief/${encodeURIComponent(id)}`)
  }
}

onMounted(async () => {
  loading.value = true
  const n = getNewsById(newsId.value)
  news.value = n
  loading.value = false

  if (explainAuto.value && news.value) {
    setTimeout(() => runExplain(), 200)
  }
})

watch(
  () => routeNewsId.value,
  async () => {
    loading.value = true
    news.value = getNewsById(newsId.value)
    explainError.value = ''
    explainStatus.value = null
    classroomUrl.value = ''
    loading.value = false

    if (explainAuto.value && news.value) {
      setTimeout(() => runExplain(), 200)
    }
  },
)
</script>

<style scoped>
.news-page {
  min-height: 100vh;
  padding: 24px 20px;
}

.news-header {
  max-width: 1200px;
  margin: 0 auto 16px;
}

.back-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--accent);
}

.load-state,
.load-error {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.news-content {
  max-width: 1200px;
  margin: 0 auto;
}

.news-top {
  background: var(--bg-card);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-xl);
  padding: 20px;
  box-shadow: var(--shadow-soft);
}

.news-title {
  margin: 0 0 12px;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
  font-size: 1.6rem;
}

.news-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.news-source {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.news-original {
  color: var(--accent);
  font-size: 0.95rem;
  text-decoration: none;
}

.news-original:hover {
  text-decoration: underline;
}

.news-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.news-action-btn {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--bg-glass-border);
  background: rgba(0, 0, 0, 0.16);
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.news-action-btn:hover {
  background: rgba(99, 102, 241, 0.14);
  border-color: rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}

.news-action-summary {
  background: rgba(34, 197, 94, 0.12);
}

.news-action-explain {
  background: rgba(99, 102, 241, 0.12);
}

.news-action-explain:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.news-text-wrap {
  margin-top: 16px;
  background: var(--bg-card);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-xl);
  padding: 18px;
  box-shadow: var(--shadow-soft);
}

.news-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.75;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.explain-error {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}

.explain-status {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--bg-glass-border);
  background: rgba(99, 102, 241, 0.08);
}

.explain-row {
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: flex-start;
}

.classroom-link {
  margin-top: 14px;
  padding: 10px 0;
}

.classroom-link a {
  color: var(--accent);
  text-decoration: none;
}

.classroom-link a:hover {
  text-decoration: underline;
}
</style>

