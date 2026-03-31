<template>
  <div class="workshop" ref="workshopEl">
    <aside class="history-sidebar" :class="{ expanded: sidebarExpanded }">
      <div class="sidebar-top">
        <button type="button" class="sidebar-icon-btn" :title="sidebarExpanded ? '收起侧栏' : '展开侧栏'" @click="toggleSidebar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>

        <button type="button" class="sidebar-icon-btn" title="新建对话" @click="createNewConversation">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1">
            <path d="M12 5v14M5 12h14" />
            <path d="M19 3l2 2-9.5 9.5H9.5V12z" />
          </svg>
        </button>
      </div>

      <template v-if="sidebarExpanded">
        <div class="sidebar-brand">Workshop</div>

        <div class="sidebar-actions">
          <button type="button" class="sidebar-action-row" @click="createNewConversation">
            <span class="sidebar-action-icon">✎</span>
            <span>发起新对话</span>
          </button>
          <div class="sidebar-user-card">
            <div class="sidebar-user-label">当前用户</div>
            <div class="sidebar-user-name">{{ userDisplayName }}</div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-section-title">对话</div>
          <div class="sidebar-conversation-list">
            <div
              v-for="item in conversationList"
              :key="item.id"
              class="sidebar-conversation-item"
              :class="{ active: item.id === currentConversationId }"
            >
              <div class="sidebar-conversation-main">
                <template v-if="editingConversationId === item.id">
                  <input
                    :id="conversationInputId(item.id)"
                    v-model="editingTitle"
                    type="text"
                    class="sidebar-conversation-input"
                    maxlength="40"
                    @click.stop
                    @keydown.enter.prevent="commitRename(item.id)"
                    @keydown.esc.prevent="cancelRename"
                    @blur="commitRename(item.id)"
                  />
                </template>
                <button
                  v-else
                  type="button"
                  class="sidebar-conversation-switch"
                  @click="switchConversation(item.id)"
                >
                  <span class="sidebar-conversation-name">{{ item.title }}</span>
                  <span class="sidebar-conversation-time">{{ formatConversationTime(item.updatedAt) }}</span>
                </button>
              </div>
              <button
                type="button"
                class="sidebar-conversation-edit"
                title="修改对话名"
                @click="startRename(item.id)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
              <button
                v-if="conversationList.length > 1"
                type="button"
                class="sidebar-conversation-delete"
                title="删除对话"
                @click="deleteConversation(item.id)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div class="sidebar-footer">
          <button type="button" class="sidebar-action-row sidebar-action-row--muted" @click="logout">
            <span class="sidebar-action-icon">⚙</span>
            <span>退出登录</span>
          </button>
        </div>
      </template>
    </aside>

    <div class="workspace-main">
    <!-- Left: Chat Panel -->
    <div class="chat-panel" :style="{ width: leftWidth + '%' }">
      <div class="chat-header">
        <div class="chat-header-main">
          <div>
            <div class="chat-title-row">
              <div class="chat-title">{{ chatTitle }}</div>
              <button type="button" class="title-edit-btn" title="修改对话名" @click="startRename(currentConversationId)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            </div>
            <div class="chat-subtitle">当前用户：{{ userDisplayName }}</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" :title="sidebarExpanded ? '收起历史侧栏' : '展开历史侧栏'" @click="toggleSidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <button class="icon-btn" title="新建对话" @click="createNewConversation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button class="icon-btn" title="清空当前对话" @click="clearChat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>

      <div class="messages" ref="messagesEl">
        <div v-if="messages.length === 0" class="empty-hint">
          <p>发送消息开始与 Agent 对话</p>
        </div>
        <div v-for="(msg, i) in messages" :key="msg.key" class="message" :class="msg.role">
          <div class="msg-avatar">
            <span v-if="msg.role === 'user'">U</span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6a1 1 0 0 0-1 1v5a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V7a1 1 0 0 0-1-1z"/></svg>
          </div>
          <div class="msg-body">
            <!-- user -->
            <template v-if="msg.role === 'user'">
              <div class="user-bubble user-bubble--md">
                <MarkdownView :content="msg.content" mode="dark" />
              </div>
            </template>
            <!-- assistant：流式阶段绑定顶层 ref，避免嵌套对象不触发视图更新 -->
            <template v-else>
              <template v-if="msg.streamingLive">
                <template v-if="streamingHtml">
                  <WorkshopStreamProgress
                    :phase="2"
                    :char-count="streamingHtml.length"
                    :html-buffer="streamingHtml"
                  />
                  <div class="stream-code-shell">
                    <div class="stream-code-header">
                      <span class="stream-code-title">HTML 源码预览</span>
                      <button
                        type="button"
                        class="stream-code-copy"
                        :disabled="!streamingHtml"
                        @click="copyStreamingHtml"
                      >
                        {{ streamHtmlCopied ? '✓ 已复制' : '复制' }}
                      </button>
                    </div>
                    <div class="agent-text agent-text--stream" v-html="renderEscapedSource(streamingHtml)"></div>
                  </div>
                </template>
              </template>
              <template v-else>
                <template v-for="(seg, si) in msg.segments" :key="si">
                  <div v-if="seg.kind === 'text'" class="agent-text">
                    <MarkdownView :content="seg.content" mode="dark" />
                  </div>
                  <div v-else-if="seg.kind === 'html_source'" class="agent-html-source">
                    <div class="stream-code-header stream-code-header--static">
                      <span class="stream-code-title">HTML 源码</span>
                      <button
                        type="button"
                        class="stream-code-copy"
                        @click="copyHtmlSegment(seg.content, htmlSegCopyId(msg, si))"
                      >
                        {{ htmlSegCopiedId === htmlSegCopyId(msg, si) ? '✓ 已复制' : '复制' }}
                      </button>
                    </div>
                    <pre class="agent-html-source-pre"><code>{{ seg.content }}</code></pre>
                  </div>
                  <div v-else class="agent-card" :class="'card-' + seg.type">
                    <div class="agent-card-header" @click="seg.open = !seg.open">
                      <span class="card-icon">{{ seg.icon }}</span>
                      <span class="card-title-text">{{ seg.title }}</span>
                      <svg class="chevron" :class="{ open: seg.open }" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <div v-if="seg.open" class="agent-card-body">
                      <pre v-if="seg.type === 'bash'" class="bash-block"><code>{{ seg.content }}</code></pre>
                      <MarkdownView v-else :content="seg.content" mode="dark" />
                    </div>
                  </div>
                </template>
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
        <button class="send-btn" :disabled="!inputText.trim() || busy" @click="sendMessage">
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
          <p v-if="busy">{{ loading ? '正在上传，完成后即可预览…' : '正在生成，全部完成后将在此展示预览…' }}</p>
          <p v-else>成果将在这里展示</p>
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
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { logout as logoutApi } from '../api/auth.js'
import { streamGenerate, uploadHTML } from '../api/workshop.js'
import {
  deleteWorkshopConversation,
  fetchWorkshopConversations,
  saveWorkshopConversation,
} from '../api/workshopConversations.js'
import WorkshopStreamProgress from '../components/WorkshopStreamProgress.vue'
import MarkdownView from '../components/MarkdownView.vue'
import { clearCurrentUser, getCurrentUser, getUserDisplayName } from '../utils/auth.js'
import { createEmptyConversation } from '../utils/workshopHistory.js'

const router = useRouter()
const currentUser = ref(getCurrentUser())
const userDisplayName = computed(() => getUserDisplayName(currentUser.value) || '未登录')
const sidebarExpanded = ref(false)

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

// ── Chat state ─────────────────────────────────────────────────
let messageKeySeq = 0
function allocMessageKey() {
  messageKeySeq += 1
  return messageKeySeq
}

const messages = ref([])
const inputText = ref('')
/** SSE：给用户看的说明（Markdown） */
const streamingFriendly = ref('')
/** SSE：HTML 源码（转义后展示） */
const streamingHtml = ref('')
/** 整段请求进行中（含 SSE 与上传），用于禁用发送避免重复提交 */
const busy = ref(false)
/** 仅用于底部「打字点」：首包前的等待、上传阶段 */
const loading = ref(false)
const chatTitle = ref('Agent 对话')
const messagesEl = ref(null)
const textareaEl = ref(null)
const conversationList = ref([])
const currentConversationId = ref('')
const editingConversationId = ref('')
const editingTitle = ref('')
let historyHydrating = false
let persistTimer = null
const historyReady = ref(false)

// ── Right panel state ──────────────────────────────────────────
const previewMode = ref('empty')
const previewHtml = ref('')
const previewUrl = ref('')
const previewCode = ref({ lang: '', content: '' })
const iframeKey = ref(0)
const codeCopied = ref(false)
const urlLoadError = ref(false)

function cloneMessages(list) {
  return JSON.parse(JSON.stringify(Array.isArray(list) ? list : []))
}

function buildConversationSnapshot() {
  const current = conversationList.value.find((item) => item.id === currentConversationId.value)
  return {
    id: currentConversationId.value,
    title: chatTitle.value || '新对话',
    createdAt: current?.createdAt || new Date().toISOString(),
    messages: cloneMessages(messages.value),
    updatedAt: new Date().toISOString(),
    preview: {
      mode: previewMode.value,
      html: previewHtml.value,
      url: previewUrl.value,
      code: { ...previewCode.value },
    },
  }
}

function applyConversation(conversation) {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  cancelRename()
  historyHydrating = true
  currentConversationId.value = conversation.id
  chatTitle.value = conversation.title || '新对话'
  messages.value = cloneMessages(conversation.messages || [])
  previewMode.value = conversation.preview?.mode || 'empty'
  previewHtml.value = conversation.preview?.html || ''
  previewUrl.value = conversation.preview?.url || ''
  previewCode.value = {
    lang: conversation.preview?.code?.lang || '',
    content: conversation.preview?.code?.content || '',
  }
  streamingFriendly.value = ''
  streamingHtml.value = ''
  urlLoadError.value = false
  nextTick(() => {
    historyHydrating = false
    scrollBottom()
  })
}

async function persistConversations() {
  if (historyHydrating || !historyReady.value || !currentUser.value?.username || !currentConversationId.value) return
  const snapshot = buildConversationSnapshot()
  const nextList = [...conversationList.value]
  const index = nextList.findIndex((item) => item.id === snapshot.id)
  if (index >= 0) {
    nextList[index] = {
      ...nextList[index],
      ...snapshot,
      createdAt: nextList[index].createdAt || snapshot.updatedAt,
    }
  } else {
    nextList.unshift({
      ...snapshot,
      createdAt: snapshot.updatedAt,
    })
  }
  nextList.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  conversationList.value = nextList
  const saved = await saveWorkshopConversation(snapshot)
  const savedIndex = conversationList.value.findIndex((item) => item.id === saved.id)
  if (savedIndex >= 0) {
    const merged = [...conversationList.value]
    merged[savedIndex] = {
      ...merged[savedIndex],
      ...saved,
    }
    merged.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    conversationList.value = merged
  }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(async () => {
    await persistConversations()
    persistTimer = null
  }, 120)
}

async function createNewConversation() {
  const conversation = createEmptyConversation()
  conversationList.value = [conversation, ...conversationList.value]
  applyConversation(conversation)
  await persistConversations()
  sidebarExpanded.value = true
  startRename(conversation.id)
}

function switchConversation(id) {
  if (!id || id === currentConversationId.value || busy.value || editingConversationId.value) return
  const conversation = conversationList.value.find((item) => item.id === id)
  if (conversation) applyConversation(conversation)
}

async function deleteConversation(id) {
  if (!id || conversationList.value.length <= 1 || busy.value) return
  const conversation = conversationList.value.find((item) => item.id === id)
  const targetTitle = conversation?.title || '该对话'
  const confirmed = window.confirm(`确定删除“${targetTitle}”吗？删除后无法恢复。`)
  if (!confirmed) return
  await deleteWorkshopConversation(id)
  const nextList = conversationList.value.filter((item) => item.id !== id)
  conversationList.value = nextList
  if (currentConversationId.value === id && nextList[0]) {
    applyConversation(nextList[0])
  }
}

async function loadWorkshopHistory() {
  if (!currentUser.value?.username) {
    router.push('/login')
    return
  }
  const conversations = await fetchWorkshopConversations()
  conversationList.value = conversations
  let current = conversations[0]
  if (!current) {
    current = createEmptyConversation()
    conversationList.value = [current]
    historyReady.value = true
    applyConversation(current)
    await persistConversations()
    return
  }
  applyConversation(current)
  historyReady.value = true
}

async function logout() {
  await logoutApi().catch(() => null)
  clearCurrentUser()
  router.push('/login')
}

function toggleSidebar() {
  sidebarExpanded.value = !sidebarExpanded.value
}

function conversationInputId(id) {
  return `conversation-title-input-${id}`
}

function focusRenameInput(id) {
  nextTick(() => {
    const el = document.getElementById(conversationInputId(id))
    if (el instanceof HTMLInputElement) {
      el.focus()
      el.select()
    }
  })
}

function startRename(id) {
  if (!id) return
  const conversation = conversationList.value.find((item) => item.id === id)
  if (!conversation) return
  editingConversationId.value = id
  editingTitle.value = conversation.title || '新对话'
  sidebarExpanded.value = true
  focusRenameInput(id)
}

function cancelRename() {
  editingConversationId.value = ''
  editingTitle.value = ''
}

async function commitRename(id) {
  if (!id || editingConversationId.value !== id) return
  const title = String(editingTitle.value || '').trim() || '新对话'
  const index = conversationList.value.findIndex((item) => item.id === id)
  if (index === -1) {
    cancelRename()
    return
  }
  const nextList = [...conversationList.value]
  nextList[index] = {
    ...nextList[index],
    title,
  }
  conversationList.value = nextList
  if (currentConversationId.value === id) {
    chatTitle.value = title
  }
  cancelRename()

  try {
    if (currentConversationId.value === id) {
      await persistConversations()
    } else {
      await saveWorkshopConversation(nextList[index])
    }
  } catch (e) {
    // 改名先保证前端立即生效；若后端同步失败，保留当前标题，避免用户感觉“没反应”。
    console.error('rename conversation failed:', e)
  }
}

function formatConversationTime(raw) {
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** 右侧仅在整段 HTML 生成结束（及上传结束）后首次展示，流式过程中不更新 iframe */
function flushPreviewImmediate(html) {
  previewHtml.value = html
  previewMode.value = 'html'
}

function copyCode() {
  navigator.clipboard.writeText(previewCode.value.content).then(() => {
    codeCopied.value = true
    setTimeout(() => { codeCopied.value = false }, 2000)
  })
}

const streamHtmlCopied = ref(false)
function copyStreamingHtml() {
  const t = streamingHtml.value
  if (!t) return
  navigator.clipboard.writeText(t).then(() => {
    streamHtmlCopied.value = true
    setTimeout(() => { streamHtmlCopied.value = false }, 2000)
  })
}

const htmlSegCopiedId = ref('')
function htmlSegCopyId(msg, si) {
  return `h-${msg.key}-${si}`
}
function copyHtmlSegment(text, id) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    htmlSegCopiedId.value = id
    setTimeout(() => {
      if (htmlSegCopiedId.value === id) htmlSegCopiedId.value = ''
    }, 2000)
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

// ── 流式 HTML 源码展示（勿当 Markdown 解析，仅转义 + 换行） ───────
function renderEscapedSource(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

// ── HTML 输出兜底清洗：避免说明文字/代码围栏混入部署文件 ───────
function normalizeGeneratedHtml(raw) {
  if (!raw) return ''
  let s = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .trim()

  // 兼容模型误输出 markdown 围栏
  s = s.replace(/^```(?:html)?\s*/i, '')
  s = s.replace(/\s*```$/i, '')

  // 优先从 doctype 起截取；否则从 <html 起截取
  const lower = s.toLowerCase()
  const docIdx = lower.indexOf('<!doctype html')
  const htmlIdx = lower.indexOf('<html')
  let start = -1
  if (docIdx !== -1) start = docIdx
  else if (htmlIdx !== -1) start = htmlIdx
  if (start > 0) s = s.slice(start)

  // 若存在 </html>，截断其后的噪声文本
  const endHtml = s.toLowerCase().lastIndexOf('</html>')
  if (endHtml !== -1) {
    s = s.slice(0, endHtml + '</html>'.length)
  }

  return s.trim()
}

// 强制让模型生成的单文件页面“铺满”当前预览 iframe，避免出现左右大片留白或右侧固定宽度导致的“长度不匹配”。
function enforceWorkshopPreviewFit(html) {
  if (!html) return html
  const fitCss = `
html, body {
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
.container, main, .right-panel, .left-panel, .preview-frame, .preview-iframe {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
}
.right-panel {
  flex: 1 1 auto !important;
  min-width: 0 !important;
}
.preview-frame, iframe {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
}
`

  // 优先插入到 </head> 前，保证更高优先级且不依赖模型结构
  if (html.includes('</head>')) {
    return html.replace('</head>', `<style>${fitCss}</style></head>`)
  }
  return `${html}<style>${fitCss}</style>`
}

// ── Send message ───────────────────────────────────────────────
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || busy.value) return

  const title = extractTitle(text)
  if (title) chatTitle.value = title

  messages.value.push({ key: allocMessageKey(), role: 'user', content: text, time: nowTime() })
  inputText.value = ''
  if (textareaEl.value) textareaEl.value.style.height = 'auto'
  busy.value = true
  loading.value = true
  previewHtml.value = ''
  previewMode.value = 'empty'
  scrollBottom()

  const assistantMsg = {
    key: allocMessageKey(),
    role: 'assistant',
    segments: [],
    streamingLive: true,
    time: ''
  }
  messages.value.push(assistantMsg)
  streamingFriendly.value = ''
  streamingHtml.value = ''
  // 流式阶段由助手气泡展示进度，勿与全局 loading 的「打字点」叠在一起（否则会像一直卡在加载）
  loading.value = false

  let generatedHTML = ''
  let cleanedHTML = ''
  try {
    for await (const part of streamGenerate(
      text,
      '你是资深前端与交互设计师，擅长用单个 HTML 文件实现完整、美观、可交互的页面；'
      + '面向用户的说明需写清功能定位、结构亮点，并交代两阶段输出与右侧预览的进度含义。'
    )) {
      if (part.kind === 'friendly') {
        streamingFriendly.value += part.content
      } else {
        streamingHtml.value += part.content
        generatedHTML += part.content
      }
      await nextTick()
      scrollBottom()
    }

    const friendlyText = streamingFriendly.value.trim()
    cleanedHTML = normalizeGeneratedHtml(generatedHTML)
    cleanedHTML = enforceWorkshopPreviewFit(cleanedHTML)
    const htmlText = cleanedHTML.trim()

    if (!htmlText) {
      assistantMsg.streamingLive = false
      streamingFriendly.value = ''
      streamingHtml.value = ''
      const hint = friendlyText
        ? `${friendlyText}\n\n`
        : ''
      assistantMsg.segments = [
        {
          kind: 'text',
          content:
            `${hint}⚠️ 未识别到页面 HTML（模型需先写说明，再单独一行输出分隔符 \`<<<HTML_BEGIN>>>\`，其后跟完整 HTML）。请重试或简化需求。`,
        },
      ]
    } else {
      assistantMsg.streamingLive = false
      streamingFriendly.value = ''
      streamingHtml.value = ''

      // 生成完成后，上传到 OSS
      loading.value = true
      assistantMsg.segments = [
        { kind: 'text', content: '📤 正在上传文件…' },
      ]
      await nextTick()
      scrollBottom()

      const fileName = `workshop-${Date.now()}.html`
      const { url } = await uploadHTML(fileName, cleanedHTML)

      // 更新消息：说明 + 完成提示 + 预览卡片 + 窄列展示的 HTML 源码
      assistantMsg.segments = [
        { kind: 'text', content: '✅ **已完成** 已上传，可在右侧预览或新标签打开。' },
        {
          kind: 'card',
          type: 'result',
          icon: '🌐',
          title: '在线预览',
          content: url,
          open: true,
        },
        { kind: 'html_source', content: cleanedHTML },
      ]

      // 右侧仅在全部生成并上传成功后首次用 URL 加载（流式过程中不刷新 iframe）
      previewUrl.value = url
      previewMode.value = 'url'
      iframeKey.value++
    }

  } catch (e) {
    assistantMsg.streamingLive = false
    streamingFriendly.value = ''
    streamingHtml.value = ''
    const errorMsg = e.name === 'AbortError'
      ? '⚠️ 请求超时，请稍后重试'
      : `⚠️ 请求失败：${e.message}`
    const segs = [{ kind: 'text', content: errorMsg }]
    if (cleanedHTML?.trim()) {
      segs.push({ kind: 'html_source', content: cleanedHTML.trim() })
      // 上传失败等：用本地 HTML 一次性展示在右侧
      flushPreviewImmediate(enforceWorkshopPreviewFit(cleanedHTML.trim()))
    }
    assistantMsg.segments = segs
  } finally {
    busy.value = false
    loading.value = false
  }

  assistantMsg.time = nowTime()
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
  streamingFriendly.value = ''
  streamingHtml.value = ''
  chatTitle.value = '新对话'
  previewMode.value = 'empty'
  previewHtml.value = ''
  previewUrl.value = ''
  previewCode.value = { lang: '', content: '' }
  urlLoadError.value = false
  persistConversations()
}

onMounted(async () => {
  try {
    await loadWorkshopHistory()
  } catch (e) {
    const fallback = createEmptyConversation()
    conversationList.value = [fallback]
    historyReady.value = true
    applyConversation(fallback)
  }
})

watch(
  [messages, chatTitle, previewMode, previewHtml, previewUrl, previewCode],
  () => {
    if (historyHydrating) return
    schedulePersist()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  stopDrag()
  if (persistTimer) clearTimeout(persistTimer)
  persistConversations()
})
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

.history-sidebar {
  width: 74px;
  flex-shrink: 0;
  height: 100%;
  background: rgba(31, 31, 34, 0.98);
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  padding: 16px 12px 18px;
  overflow: hidden;
  transition: width 0.28s ease, padding 0.28s ease;
}

.history-sidebar.expanded {
  width: 320px;
  padding: 16px 18px 18px;
}

.sidebar-top {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
}

.history-sidebar.expanded .sidebar-top {
  flex-direction: row;
  justify-content: space-between;
}

.sidebar-icon-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}

.sidebar-icon-btn:hover {
  background: rgba(255,255,255,0.08);
  transform: translateY(-1px);
}

.sidebar-brand {
  margin-top: 14px;
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: rgba(255,255,255,0.94);
}

.sidebar-actions {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sidebar-action-row {
  width: 100%;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: rgba(255,255,255,0.88);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 10px;
  font-size: 1rem;
  cursor: pointer;
  text-align: left;
}

.sidebar-action-row:hover {
  background: rgba(255,255,255,0.06);
}

.sidebar-action-row--muted {
  color: rgba(255,255,255,0.74);
}

.sidebar-action-icon {
  width: 28px;
  text-align: center;
  font-size: 1.2rem;
}

.sidebar-user-card {
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
}

.sidebar-user-label {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.54);
}

.sidebar-user-name {
  margin-top: 6px;
  font-size: 0.98rem;
  color: rgba(255,255,255,0.92);
}

.sidebar-section {
  margin-top: 28px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.sidebar-section-title {
  margin-bottom: 14px;
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255,255,255,0.94);
}

.sidebar-conversation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  min-height: 0;
}

.sidebar-conversation-item {
  display: flex;
  align-items: stretch;
  border-radius: 22px;
  overflow: hidden;
  background: transparent;
}

.sidebar-conversation-item.active {
  background: rgba(48, 79, 139, 0.82);
}

.sidebar-conversation-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.sidebar-conversation-switch {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  padding: 15px 18px;
}

.sidebar-conversation-input {
  width: 100%;
  margin: 10px 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(99,102,241,0.42);
  background: rgba(12,12,16,0.78);
  color: rgba(255,255,255,0.94);
  font-size: 0.92rem;
  outline: none;
}

.sidebar-conversation-name,
.sidebar-conversation-time {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-conversation-name {
  font-size: 0.98rem;
  color: rgba(255,255,255,0.94);
}

.sidebar-conversation-time {
  margin-top: 6px;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.6);
}

.sidebar-conversation-edit,
.sidebar-conversation-delete {
  width: 40px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.46);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-conversation-edit:hover,
.sidebar-conversation-delete:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.sidebar-footer {
  margin-top: 14px;
}

.workspace-main {
  flex: 1;
  min-width: 0;
  display: flex;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--bg-glass-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}
.chat-header-main {
  min-width: 0;
}
.chat-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chat-title { font-weight: 600; font-size: 0.95rem; }
.title-edit-btn {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.04);
  color: var(--text-secondary, #888);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.title-edit-btn:hover {
  background: rgba(255,255,255,0.08);
  color: var(--text-primary, #e8e8f0);
}
.chat-subtitle {
  margin-top: 4px;
  color: var(--text-secondary, #888);
  font-size: 0.8rem;
}
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

/* VMarkdownView 在紫色气泡内：强制浅色字，避免 dark 主题与背景冲突 */
.user-bubble--md :deep(.markdown-body) {
  color: #fff !important;
  background: transparent !important;
}
.user-bubble--md :deep(.markdown-body a) {
  color: #ede9fe !important;
}
.user-bubble--md :deep(.markdown-body code) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
}
.user-bubble--md :deep(.markdown-body pre) {
  background: rgba(0, 0, 0, 0.22) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.agent-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary, #e8e8f0);
  padding: 2px 0;
}

.agent-friendly {
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--text-primary, #e8e8f0);
  padding: 4px 0 10px;
  border-bottom: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.06));
  margin-bottom: 8px;
}

/* 流式 HTML：加宽、压低高度（约一屏内短条预览），与图中红框比例接近 */
.stream-code-shell {
  width: 100%;
  max-width: 100%;
  margin-top: 4px;
  border-radius: 10px;
  border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.1));
  background: rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.stream-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.08));
  background: rgba(255, 255, 255, 0.03);
}

.stream-code-header--static {
  margin-bottom: 0;
  border-radius: 10px 10px 0 0;
}

.stream-code-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary, #a1a1b0);
}

.stream-code-copy {
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.35);
  background: rgba(99, 102, 241, 0.12);
  color: #a5b4fc;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.stream-code-copy:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.22);
  color: #e0e7ff;
}
.stream-code-copy:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.agent-text--stream {
  width: 100%;
  max-width: 100%;
  max-height: clamp(132px, 26vh, 210px);
  overflow: auto;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.78rem;
  line-height: 1.45;
  background: rgba(0, 0, 0, 0.35);
  border: none;
  border-radius: 0;
  padding: 10px 12px;
  word-break: break-word;
}

/* 生成结束后仍展示源码：与流式区同宽，同样压低高度 */
.agent-html-source {
  width: 100%;
  max-width: 100%;
  margin-top: 10px;
  border-radius: 10px;
  border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.1));
  overflow: hidden;
  background: rgba(0, 0, 0, 0.22);
}
.agent-html-source-pre {
  margin: 0;
  padding: 10px 12px;
  max-height: clamp(132px, 26vh, 210px);
  overflow: auto;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.76rem;
  line-height: 1.45;
  background: rgba(0, 0, 0, 0.35);
  border: none;
  border-radius: 0;
  white-space: pre-wrap;
  word-break: break-all;
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

@media (max-width: 900px) {
  .history-sidebar.expanded {
    width: 270px;
  }
}

@media (max-width: 768px) {
  .history-sidebar {
    width: 64px;
    padding: 12px 10px 14px;
  }

  .history-sidebar.expanded {
    width: 248px;
    padding: 12px 14px 14px;
  }

  .sidebar-brand {
    font-size: 1.55rem;
  }
}
</style>
