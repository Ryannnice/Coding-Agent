/**
 * Workshop API - 对接 url-generate 后端
 */

const API_BASE = import.meta.env.VITE_WORKSHOP_API_URL || '/api/workshop'

/**
 * @typedef {{ kind: 'friendly' | 'html', content: string }} WorkshopStreamPart
 */

/**
 * 解析后端 SSE（text/event-stream，每行 data: JSON）
 * friendly = 给用户看的说明；text = HTML 源码增量（与旧版兼容）
 * @param {Response} response
 * @returns {AsyncGenerator<WorkshopStreamPart, void, void>}
 */
async function* parseSseWorkshopStream(response) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('响应体不可读')

  const decoder = new TextDecoder()
  let buffer = ''

  function* yieldFromDataLine(trimmed) {
    if (!trimmed.startsWith('data')) return
    const colon = trimmed.indexOf(':')
    if (colon < 0) return
    const raw = trimmed.slice(colon + 1).trimStart()
    if (!raw || raw === '[DONE]') return
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    const c = msg.content
    if (typeof c !== 'string' || c.length === 0) return
    if (msg.type === 'friendly') {
      yield { kind: 'friendly', content: c }
    }
    if (msg.type === 'text') {
      yield { kind: 'html', content: c }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })

    if (done) {
      const lines = buffer.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trimEnd()
        if (!trimmed) continue
        yield* yieldFromDataLine(trimmed)
      }
      break
    }

    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trimEnd()
      if (!trimmed) continue
      yield* yieldFromDataLine(trimmed)
    }
  }
}

/**
 * 流式生成：先推送用户友好说明（friendly），再推送 HTML 源码（html）
 * @param {string} context - 用户输入的内容
 * @param {string} systemPrompt - 系统提示词
 * @returns {AsyncGenerator<WorkshopStreamPart>}
 */
export async function* streamGenerate(context, systemPrompt) {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ context, system_prompt: systemPrompt }),
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const err = await response.json()
      if (typeof err.detail === 'string') detail = err.detail
      else if (err.detail != null) detail = JSON.stringify(err.detail)
      else if (err.error) detail = err.error
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }

  yield* parseSseWorkshopStream(response)
}

/**
 * 上传 HTML 文件到 OSS
 * @param {string} fileName - 文件名
 * @param {string} htmlContent - HTML 内容
 * @returns {Promise<{url: string}>} 上传后的 URL
 */
export async function uploadHTML(fileName, htmlContent) {
  const blob = new Blob([htmlContent], { type: 'text/html' })
  const formData = new FormData()
  formData.append('file', blob, fileName)

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`)
  }

  return response.json()
}
