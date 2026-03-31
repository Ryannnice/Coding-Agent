import { request } from './client.js'

/**
 * 获取单条新闻（来自 Crawl DB）
 * @param {number|string} newsId
 */
export async function getNewsArticle(newsId) {
  const id = encodeURIComponent(String(newsId || '').trim())
  const { ok, data } = await request(`/api/news/${id}`)
  if (!ok || !data?.success) throw new Error(data?.message || '获取新闻失败')
  return data.data
}

/**
 * 生成「AI资讯速览」同风格内容
 * @param {number} newsId
 */
export async function generateNewsBrief(newsId) {
  const { ok, data } = await request(`/api/news/brief`, {
    method: 'POST',
    body: JSON.stringify({ news_id: Number(newsId) }),
  })
  if (!ok || !data?.success) throw new Error(data?.message || '生成速览失败')
  return data.data
}

