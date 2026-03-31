<template>
  <div class="workshop" ref="workshopEl">
    <!-- Left: Chat Panel -->
    <div class="chat-panel" :style="{ width: leftWidth + '%' }">
      <div class="chat-header">
        <span class="chat-title">{{ chatTitle }}</span>
        <div class="header-actions">
          <button class="icon-btn" title="新建对话" @click="clearChat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button class="icon-btn" title="清空" @click="clearChat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>

      <div class="messages" ref="messagesEl">
        <div v-if="messages.length === 0" class="empty-hint">
          <p>发送消息开始与 Agent 对话</p>
        </div>
        <div v-for="(msg, i) in messages" :key="i" class="message" :class="msg.role">
          <div class="msg-avatar">
            <span v-if="msg.role === 'user'">U</span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6a1 1 0 0 0-1 1v5a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V7a1 1 0 0 0-1-1z"/></svg>
          </div>
          <div class="msg-body">
            <!-- user -->
            <template v-if="msg.role === 'user'">
              <div class="user-bubble" v-html="renderMarkdown(msg.content)"></div>
            </template>
            <!-- assistant: segments 混排 -->
            <template v-else>
              <template v-for="(seg, si) in msg.segments" :key="si">
                <div v-if="seg.kind === 'text'" class="agent-text" v-html="renderMarkdown(seg.content)"></div>
                <div v-else class="agent-card" :class="'card-' + seg.type">
                  <div class="agent-card-header" @click="seg.open = !seg.open">
                    <span class="card-icon">{{ seg.icon }}</span>
                    <span class="card-title-text">{{ seg.title }}</span>
                    <svg class="chevron" :class="{ open: seg.open }" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <div v-if="seg.open" class="agent-card-body">
                    <pre v-if="seg.type === 'bash'" class="bash-block"><code>{{ seg.content }}</code></pre>
                    <div v-else v-html="renderMarkdown(seg.content)"></div>
                  </div>
                </div>
              </template>
            </template>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </div>
        <div v-if="loading" class="message assistant">
          <div class="msg-avatar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/></svg>
          </div>
          <div class="msg-body">
            <div class="typing-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>

      <div class="input-area">
        <textarea
          v-model="inputText"
          placeholder="输入消息..."
          rows="1"
          @keydown.enter.exact.prevent="sendMessage"
          @input="autoResize"
          ref="textareaEl"
        ></textarea>
        <button class="mic-btn" :class="{ recording: isRecording }" :title="isRecording ? '停止录音' : '语音输入'" @click="toggleRecording">
          <svg v-if="!isRecording" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>
        <button class="send-btn" :disabled="!inputText.trim() || loading" @click="sendMessage">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="divider" @mousedown="startDrag"></div>

    <!-- Right: Preview Panel -->
    <div class="results-panel">
      <div class="results-header">
        <span class="results-title">成果展示</span>
        <div class="header-actions">
          <span v-if="previewMode !== 'empty'" class="mode-tag">{{ previewMode === 'html' ? '预览' : previewMode === 'url' ? 'URL' : previewCode.lang }}</span>
          <button v-if="previewMode === 'html' || previewMode === 'url'" class="icon-btn" title="刷新预览" @click="iframeKey++; urlLoadError = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
      </div>

      <div class="results-content">
        <div v-if="previewMode === 'empty'" class="results-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          <p>成果将在这里展示</p>
        </div>
        <iframe
          v-else-if="previewMode === 'html'"
          :key="iframeKey"
          :srcdoc="previewHtml"
          class="preview-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        ></iframe>
        <div v-else-if="previewMode === 'url'" class="url-preview">
          <div class="url-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span class="url-text">{{ previewUrl }}</span>
            <a :href="previewUrl" target="_blank" class="url-open-btn" title="在新标签页打开">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              新标签打开
            </a>
          </div>
          <iframe
            v-if="!urlLoadError"
            :key="'url-' + iframeKey"
            :src="previewUrl"
            class="preview-iframe"
            tabindex="0"
            @load="$event.target.focus()"
            @error="urlLoadError = true"
          ></iframe>
          <div v-else class="url-fallback">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <p>该页面不支持嵌入预览</p>
            <a :href="previewUrl" target="_blank" class="fallback-link">点击在新标签页中打开 →</a>
          </div>
        </div>
        <div v-else-if="previewMode === 'code'" class="code-preview">
          <div class="code-preview-header">
            <span class="code-lang-tag">{{ previewCode.lang }}</span>
            <button class="copy-btn" @click="copyCode" :class="{ copied: codeCopied }">
              {{ codeCopied ? '✓ 已复制' : '复制' }}
            </button>
          </div>
          <pre class="code-preview-body"><code>{{ previewCode.content }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'

// ── Layout / drag ──────────────────────────────────────────────
const workshopEl = ref(null)
const leftWidth = ref(40)
let dragging = false
let startX = 0
let startW = 0

function startDrag(e) {
  dragging = true
  startX = e.clientX
  startW = leftWidth.value
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none')
}
function onDrag(e) {
  if (!dragging || !workshopEl.value) return
  const total = workshopEl.value.offsetWidth
  const delta = ((e.clientX - startX) / total) * 100
  leftWidth.value = Math.min(40, Math.max(20, startW + delta))
}
function stopDrag() {
  dragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '')
}
onBeforeUnmount(() => stopDrag())

// ── Chat state ─────────────────────────────────────────────────
const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const chatTitle = ref('Agent 对话')
const messagesEl = ref(null)
const textareaEl = ref(null)

// ── Right panel state ──────────────────────────────────────────
const previewMode = ref('empty')
const previewHtml = ref('')
const previewUrl = ref('')
const previewCode = ref({ lang: '', content: '' })
const iframeKey = ref(0)
const codeCopied = ref(false)
const urlLoadError = ref(false)

function copyCode() {
  navigator.clipboard.writeText(previewCode.value.content).then(() => {
    codeCopied.value = true
    setTimeout(() => { codeCopied.value = false }, 2000)
  })
}

// ── Voice input ────────────────────────────────────────────────
const isRecording = ref(false)
let recognition = null

function toggleRecording() {
  if (isRecording.value) {
    recognition && recognition.stop()
    isRecording.value = false
    return
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) { alert('浏览器不支持语音识别'); return }
  recognition = new SR()
  recognition.lang = 'zh-CN'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.onresult = (e) => { inputText.value += e.results[0][0].transcript; autoResize() }
  recognition.onend = () => { isRecording.value = false }
  recognition.start()
  isRecording.value = true
}

// ── Textarea auto-resize ───────────────────────────────────────
function autoResize() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

// ── Title extraction ───────────────────────────────────────────
function extractTitle(text) {
  const m = text.match(/帮我(?:生成|做|创建|开发|写|设计).*?([^\s，,。！!？?]{2,8})(?:系统|平台|工具|页面|应用|网站|程序)?/)
  if (m) return m[1] + (text.match(/系统|平台|工具|页面|应用|网站|程序/) || [''])[0]
  return null
}

// ── Markdown renderer ──────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// ── Send message ───────────────────────────────────────────────
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  const title = extractTitle(text)
  if (title) chatTitle.value = title

  messages.value.push({ role: 'user', content: text, time: nowTime() })
  inputText.value = ''
  if (textareaEl.value) textareaEl.value.style.height = 'auto'
  loading.value = true
  scrollBottom()

  messages.value.push({ role: 'assistant', segments: [], time: '' })
  // 必须通过响应式引用操作，否则 Vue 无法追踪变更
  const assistantMsg = messages.value[messages.value.length - 1]

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
      signal: controller.signal
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') break

        const msg = JSON.parse(raw)

        if (msg.type === 'result') {
          previewUrl.value = msg.url
          previewMode.value = 'url'
          iframeKey.value++
        } else if (msg.type === 'text') {
          const segs = assistantMsg.segments
          const last = segs[segs.length - 1]
          if (last && last.kind === 'text') {
            last.content += msg.content
          } else {
            segs.push({ kind: 'text', content: msg.content })
          }
        } else if (msg.type === 'card') {
          assistantMsg.segments.push({
            kind: 'card', type: msg.cardType,
            icon: msg.icon, title: msg.title, content: msg.content,
            open: msg.cardType === 'thinking'
          })
        }

        await nextTick()
        scrollBottom()
      }
    }
    clearTimeout(timeout)
  } catch (e) {
    const msg = e.name === 'AbortError' ? '⚠️ 请求超时，请稍后重试' : '⚠️ 请求失败：' + e.message
    assistantMsg.segments.push({ kind: 'text', content: msg })
  }

  assistantMsg.time = nowTime()
  loading.value = false
  await nextTick()
  scrollBottom()
}

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
function scrollBottom() {
  nextTick(() => { if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight })
}
function clearChat() {
  messages.value = []
  chatTitle.value = 'Agent 对话'
  previewMode.value = 'empty'
  previewHtml.value = ''
  previewUrl.value = ''
  previewCode.value = { lang: '', content: '' }
  urlLoadError.value = false
}
</script>

<style scoped>
.workshop {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base, #0f0f13);
  color: var(--text-primary, #e8e8f0);
  font-family: 'Inter', sans-serif;
}

.divider {
  width: 4px;
  background: var(--bg-glass-border, rgba(255,255,255,0.08));
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.2s;
}
.divider:hover { background: var(--accent, #6366f1); }

.chat-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--bg-glass-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}
.chat-title { font-weight: 600; font-size: 0.95rem; }
.header-actions { display: flex; gap: 6px; }
.icon-btn {
  background: none; border: none; cursor: pointer;
  color: var(--text-secondary, #888); padding: 5px; border-radius: 6px;
  display: flex; align-items: center;
}
.icon-btn:hover { background: rgba(255,255,255,0.06); color: var(--text-primary, #e8e8f0); }

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.empty-hint { text-align: center; color: var(--text-secondary, #888); margin-top: 60px; font-size: 0.9rem; }

.message { display: flex; gap: 10px; }
.message.user { flex-direction: row-reverse; }

.msg-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--bg-card, rgba(255,255,255,0.06));
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 600; flex-shrink: 0;
  color: var(--accent, #6366f1);
}
.message.user .msg-avatar { background: var(--accent, #6366f1); color: #fff; }

.msg-body { display: flex; flex-direction: column; gap: 6px; width: 90%; }
.message.user .msg-body { align-items: flex-end; }

.user-bubble {
  background: var(--accent, #6366f1);
  color: #fff;
  padding: 10px 14px;
  border-radius: 16px 16px 4px 16px;
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 100%;
  word-break: break-word;
}

.agent-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary, #e8e8f0);
  padding: 2px 0;
}

.msg-time { font-size: 0.72rem; color: var(--text-secondary, #888); margin-top: 2px; }

.agent-card {
  border-radius: 10px;
  border: 1px solid var(--bg-glass-border, rgba(255,255,255,0.08));
  background: var(--bg-card, rgba(255,255,255,0.04));
  overflow: hidden;
  width: 100%;
}

.agent-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  user-select: none;
  font-size: 0.85rem;
  font-weight: 500;
}
.agent-card-header:hover { background: rgba(255,255,255,0.04); }

.card-icon { font-size: 0.95rem; }
.card-title-text { flex: 1; }

.chevron { transition: transform 0.2s; flex-shrink: 0; }
.chevron.open { transform: rotate(180deg); }

.agent-card-body {
  padding: 10px 14px 12px;
  border-top: 1px solid var(--bg-glass-border, rgba(255,255,255,0.06));
  font-size: 0.83rem;
  line-height: 1.6;
  color: var(--text-secondary, #aaa);
}

.bash-block {
  margin: 0; padding: 10px 12px;
  background: rgba(0,0,0,0.3);
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.8rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.card-thinking .agent-card-header { color: #fbbf24; }
.card-plan     .agent-card-header { color: #a78bfa; }
.card-bash     .agent-card-header { color: #34d399; }
.card-read     .agent-card-header { color: #fb923c; }
.card-search   .agent-card-header { color: #818cf8; }
.card-skill    .agent-card-header { color: #f472b6; }

.typing-dots { display: flex; gap: 5px; padding: 8px 4px; }
.typing-dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--text-secondary, #888);
  animation: bounce 1.2s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--bg-glass-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}

.input-area textarea {
  flex: 1;
  background: var(--bg-card, rgba(255,255,255,0.06));
  border: 1px solid var(--bg-glass-border, rgba(255,255,255,0.1));
  border-radius: 10px;
  color: var(--text-primary, #e8e8f0);
  padding: 9px 12px;
  font-size: 0.9rem;
  resize: none;
  outline: none;
  line-height: 1.5;
  min-height: 38px;
  font-family: inherit;
}
.input-area textarea:focus { border-color: var(--accent, #6366f1); }
.input-area textarea::placeholder { color: var(--text-secondary, #666); }

.send-btn, .mic-btn {
  width: 36px; height: 36px; border-radius: 9px; border: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background 0.15s;
}
.send-btn { background: var(--accent, #6366f1); color: #fff; }
.send-btn:hover:not(:disabled) { background: #4f46e5; }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.mic-btn {
  background: var(--bg-card, rgba(255,255,255,0.06));
  color: var(--text-secondary, #888);
  border: 1px solid var(--bg-glass-border, rgba(255,255,255,0.1));
}
.mic-btn:hover { color: var(--text-primary, #e8e8f0); }
.mic-btn.recording { background: rgba(239,68,68,0.15); color: #ef4444; border-color: rgba(239,68,68,0.3); }

.results-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--bg-glass-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}
.results-title { font-weight: 600; font-size: 0.95rem; }
.mode-tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(99,102,241,0.15);
  color: var(--accent, #6366f1);
  border: 1px solid rgba(99,102,241,0.25);
}

.results-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.results-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary, #888);
  font-size: 0.9rem;
}

.preview-iframe {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: block;
  border: none;
  background: #fff;
}

.code-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.code-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid var(--bg-glass-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}
.code-lang-tag { font-size: 0.78rem; color: var(--text-secondary, #888); font-family: monospace; }
.copy-btn {
  font-size: 0.78rem;
  padding: 3px 10px;
  border-radius: 5px;
  border: 1px solid var(--bg-glass-border, rgba(255,255,255,0.1));
  background: none;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: all 0.15s;
}
.copy-btn:hover { color: var(--text-primary, #e8e8f0); }
.copy-btn.copied { color: #34d399; border-color: rgba(52,211,153,0.3); }

.url-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
}

.url-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid var(--bg-glass-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
  color: var(--text-secondary, #888);
  font-size: 0.82rem;
}

.url-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
}

.url-open-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent, #6366f1);
  text-decoration: none;
  font-size: 0.78rem;
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid rgba(99,102,241,0.25);
  transition: background 0.15s;
}
.url-open-btn:hover { background: rgba(99,102,241,0.1); }

.url-fallback {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary, #888);
  font-size: 0.9rem;
}

.fallback-link {
  color: var(--accent, #6366f1);
  text-decoration: none;
  font-size: 0.88rem;
}
.fallback-link:hover { text-decoration: underline; }

.code-preview-body {
  flex: 1;
  overflow: auto;
  margin: 0;
  padding: 16px;
  font-family: monospace;
  font-size: 0.82rem;
  line-height: 1.65;
  color: #c9d1d9;
  background: rgba(0,0,0,0.2);
  white-space: pre;
}
</style>
