import { request } from './client.js'

export async function fetchWorkshopConversations() {
  const { ok, data } = await request('/api/workshop-history/conversations')
  if (!ok || !data?.success) {
    throw new Error(data?.detail || data?.message || '获取 Workshop 对话失败')
  }
  return Array.isArray(data.list) ? data.list : []
}

export async function saveWorkshopConversation(conversation) {
  const id = encodeURIComponent(String(conversation?.id || '').trim())
  const { ok, data } = await request(`/api/workshop-history/conversations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(conversation),
  })
  if (!ok || !data?.success) {
    throw new Error(data?.detail || data?.message || '保存 Workshop 对话失败')
  }
  return data.data
}

export async function deleteWorkshopConversation(conversationId) {
  const id = encodeURIComponent(String(conversationId || '').trim())
  const { ok, data } = await request(`/api/workshop-history/conversations/${id}`, {
    method: 'DELETE',
  })
  if (!ok || !data?.success) {
    throw new Error(data?.detail || data?.message || '删除 Workshop 对话失败')
  }
  return true
}
