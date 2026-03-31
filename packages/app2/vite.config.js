import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 服务器部署说明：
// 1. 开发环境：使用以下代理配置，VITE_OPENMAIC_BASE_URL=/openmaic
// 2. 生产环境：
//    - 方案A：修改 .env.production 中的 VITE_OPENMAIC_BASE_URL 为服务器地址
//    - 方案B：使用 Nginx 反向代理 /openmaic 到 http://localhost:3000
//    - OpenMAIC 已添加 CORS 支持，允许跨域访问

export default defineConfig({
  plugins: [vue()],
  server: {
    // 与 Crawl 默认端口 8000 错开，否则无法同时跑 npm run dev 与本机/容器 Crawl
    port: 5173,
    proxy: {
      // 开发环境代理：前端请求 /openmaic/api/xxx → 转发到 http://localhost:3000/api/xxx
      // 生产环境此代理不生效，需要直接配置 VITE_OPENMAIC_BASE_URL 或使用 Nginx
      '/openmaic': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openmaic/, ''),
      },
      // Workshop 后端代理
      '/api/workshop': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/workshop/, ''),
      },
      // AI 新闻榜单代理服务（直接走 Crawl API）
      '/api/ranks': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/articles': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/page-screenshot': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/page-screenshot.png': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/og-image': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 登录认证
      '/api/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
