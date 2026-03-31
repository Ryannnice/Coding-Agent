const LS_KEY = 'openmaic_news_favorites_v1'

/**
 * @typedef {{ newsId: string, title: string, source?: string, url: string, text: string }} FavoriteNews
 */

function safeParse(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * @returns {FavoriteNews[]}
 */
export function getFavorites() {
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return []
  const parsed = safeParse(raw)
  return Array.isArray(parsed) ? parsed : []
}

/**
 * @param {FavoriteNews} news
 */
export function addFavorite(news) {
  if (!news?.newsId) return
  const list = getFavorites().filter((x) => x.newsId !== news.newsId)
  list.unshift(news)
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

/**
 * @param {string} newsId
 * @returns {boolean}
 */
export function isFavorite(newsId) {
  if (!newsId) return false
  return getFavorites().some((x) => x.newsId === newsId)
}

