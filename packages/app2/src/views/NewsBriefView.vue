<template>
  <div class="brief-page">
    <nav class="brief-nav">
      <router-link to="/channel" class="back-link">← 返回频道排行榜</router-link>
      <a v-if="article?.url" class="open-origin" :href="article.url" target="_blank" rel="noreferrer noopener">
        打开原网页 ↗
      </a>
    </nav>

    <div v-if="loading" class="load-state">
      <span class="load-dot" /><span class="load-dot" /><span class="load-dot" />
    </div>
    <div v-else-if="error" class="load-error">
      <p>{{ error }}</p>
      <button type="button" class="retry-btn" @click="loadAll">重试</button>
    </div>

    <article v-else class="brief-article">
      <header class="article-header">
        <time v-if="article?.published_at" class="article-date">{{ formatDate(article.published_at) }}</time>
        <h1 class="article-headline">{{ brief?.headline || article?.title || '' }}</h1>
      </header>

      <section class="article-card">
        <div class="card-title-row">
          <span class="card-index">01</span>
          <h2 class="card-title">{{ brief?.headline || article?.title || '' }}</h2>
        </div>

        <div v-if="displayParagraphs.length" class="card-body">
          <p v-for="(p, i) in displayParagraphs" :key="i" class="card-para">{{ p }}</p>
        </div>

        <div v-if="brief?.tags?.length" class="card-takeaways">
          <div v-for="t in brief.tags" :key="t" class="takeaway-item">{{ t }}</div>
        </div>

        <div v-if="brief?.sources?.length" class="card-sources">
          <div class="sources-label">来源</div>
          <div class="sources-list">
            <a
              v-for="(s, i) in brief.sources"
              :key="i"
              class="source-item"
              :href="s.url"
              target="_blank"
              rel="noreferrer noopener"
            >
              <span class="source-text">{{ s.label || '来源链接' }}</span>
              <span class="source-domain">{{ s.domain || extractDomain(s.url) }}</span>
            </a>
          </div>
        </div>
      </section>

      <footer class="article-footer">
        <span class="footer-source">{{ footerDomain }}</span>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getNewsArticle, generateNewsBrief } from '../api/newsBrief.js'

const route = useRoute()
const routeNewsId = computed(() => String(route.params.newsId || '').trim())

const loading = ref(true)
const error = ref('')
const article = ref(null)
const brief = ref(null)

function cleanPara(s) {
  return (s || '').replace(/[。.]\s*来源\s*$/, '。').replace(/\s*来源\s*$/, '').trim()
}

const displayParagraphs = computed(() => {
  const lead = cleanPara(brief.value?.lead || '')
  const rawParas = brief.value?.paragraphs
  let paras = Array.isArray(rawParas) ? rawParas.map(cleanPara).filter(Boolean) : []

  let result
  if (!paras.length) {
    result = lead ? [lead] : []
  } else {
    const isDup = paras.some((pt) => pt === lead || lead.startsWith(pt) || pt.startsWith(lead))
    result = isDup ? paras : (lead ? [lead, ...paras] : paras)
  }

  if (result.length <= 1 && article.value) {
    const summary = cleanPara(article.value.summary || '')
    const content = cleanPara(article.value.content || '')
    const existing = result.join('')
    if (summary && !existing.includes(summary) && !summary.includes(existing)) {
      result.push(summary)
    }
    if (content && content.length > 60) {
      const contentParas = content.split(/\n+/).map(p => p.trim()).filter(p => p.length > 20)
      for (const cp of contentParas) {
        if (!existing.includes(cp) && !result.some(r => r.includes(cp) || cp.includes(r))) {
          result.push(cp)
        }
        if (result.length >= 4) break
      }
    }
  }

  return result.filter(Boolean)
})

const footerDomain = computed(() => {
  const url = article.value?.url || ''
  return extractDomain(url) || article.value?.source || ''
})

function isNumericId(id) {
  return /^[0-9]+$/.test(String(id || ''))
}

function formatDate(raw) {
  try {
    const d = new Date(raw)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${y}年${m}月${day}日`
  } catch {
    return ''
  }
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

async function loadAll() {
  loading.value = true
  error.value = ''
  article.value = null
  brief.value = null

  const id = routeNewsId.value
  if (!isNumericId(id)) {
    error.value = `该条新闻暂不支持概述渲染（newsId：${id}）`
    loading.value = false
    return
  }

  try {
    const a = await getNewsArticle(id)
    article.value = a
    const b = await generateNewsBrief(Number(id))
    brief.value = b
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)
watch(
  () => routeNewsId.value,
  () => loadAll(),
)
</script>

<style scoped>
.brief-page {
  min-height: 100vh;
  padding: 20px 16px 60px;
  background: var(--bg-primary);
  overflow: visible;
}

/* ── 顶部导航 ── */
.brief-nav {
  max-width: 720px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.back-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.88rem;
  transition: color var(--transition-fast);
}
.back-link:hover {
  color: var(--accent);
}

.open-origin {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.86rem;
  opacity: 0.85;
  transition: opacity var(--transition-fast);
}
.open-origin:hover {
  opacity: 1;
  text-decoration: underline;
}

/* ── 加载态 ── */
.load-state {
  max-width: 720px;
  margin: 0 auto;
  padding: 80px 24px;
  text-align: center;
  display: flex;
  gap: 6px;
  justify-content: center;
}

.load-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.5;
  animation: dot-pulse 1.4s ease-in-out infinite;
}
.load-dot:nth-child(2) { animation-delay: 0.2s; }
.load-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.1); }
}

.load-error {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.retry-btn {
  margin-top: 14px;
  padding: 10px 20px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.92rem;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.retry-btn:hover {
  background: var(--accent-hover);
}

/* ── 文章主体 ── */
.brief-article {
  max-width: 720px;
  margin: 0 auto;
}

/* ── 文章头部：日期 + 大标题 + 副标题 ── */
.article-header {
  text-align: center;
  padding: 0 8px 32px;
  border-bottom: 1px solid var(--bg-glass-border);
  margin-bottom: 32px;
}

.article-date {
  display: block;
  font-size: 0.82rem;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  margin-bottom: 18px;
}

.article-headline {
  margin: 0 0 16px;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.35;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

/* ── 内容卡片 ── */
.article-card {
  background: var(--bg-card);
  border: 1px solid var(--bg-glass-border);
  border-radius: var(--radius-xl);
  padding: 28px 28px 24px;
  box-shadow: var(--shadow-soft);
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.card-index {
  flex-shrink: 0;
  font-family: 'Outfit', sans-serif;
  font-weight: 300;
  font-size: 1.5rem;
  color: var(--text-muted);
  line-height: 1.3;
  opacity: 0.6;
}

.card-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-primary);
}

/* ── 段落 ── */
.card-body {
  margin-bottom: 24px;
}

.card-para {
  margin: 0 0 16px;
  font-size: 0.95rem;
  line-height: 1.9;
  color: var(--text-secondary);
  text-align: justify;
}
.card-para:last-child {
  margin-bottom: 0;
}

/* ── 关键要点 / 标签 → 胶囊药丸样式 ── */
.card-takeaways {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
  padding-top: 4px;
}

.takeaway-item {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 999px;
  font-size: 0.84rem;
  line-height: 1.4;
  color: var(--accent);
  font-weight: 500;
  white-space: nowrap;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.takeaway-item:hover {
  background: rgba(99, 102, 241, 0.14);
  border-color: rgba(99, 102, 241, 0.3);
}

/* ── 来源 ── */
.card-sources {
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sources-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 10px;
  letter-spacing: 0.04em;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  padding: 6px 0;
  transition: opacity var(--transition-fast);
}
.source-item:hover {
  opacity: 0.8;
}

.source-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.source-domain {
  font-size: 0.78rem;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* ── 底部标签行 ── */
.article-footer {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 0 0;
}

.footer-source {
  font-size: 0.82rem;
  color: var(--text-muted);
}

/* ── 响应式 ── */
@media (max-width: 640px) {
  .brief-page {
    padding: 16px 12px 40px;
  }
  .article-headline {
    font-size: 1.4rem;
  }
  .article-card {
    padding: 20px 18px 18px;
  }
  .card-title-row {
    gap: 10px;
  }
  .card-index {
    font-size: 1.25rem;
  }
  .card-title {
    font-size: 1.05rem;
  }
}
</style>
