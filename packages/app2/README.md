# Vue 工字型交互仪表盘

基于手绘原型构建的响应式 Vue 前端应用，包含登录、工字型主页与频道排行榜。

## 功能

- **登录页**：居中卡片，用户名/密码输入，登录按钮
- **工字型主页**：Workshop（顶）、Channel（左）、OpenMAIC（右）三块卡片布局
- **频道排行榜**：左侧排名、中间视频列表、右侧统计数据，支持响应式

## 技术栈

- Vue 3 + JavaScript
- Vue Router
- @vueuse/motion（页面与组件动画）
- Vite

## 启动

```bash
npm install
npm run dev
```

访问 http://localhost:5173（Vite 与 Crawl 的 8000 错开，需另起 Crawl：`Backend/Crawl` 下 `python run_local.py` 或 Docker 映射 8000）

可选：在项目根目录 `.env` 中配置 `VITE_OPENMAIC_BASE_URL`（例如 `http://localhost:3000`）。频道页「讲解」会跳转到 OpenMAIC 的 `/api/dialog-prefill?title=…&to=home`，由服务端写入预填并回到首页。

## Docker 部署到服务器

**服务器上需要安装的只有 Docker**，无需单独安装 Node、Nginx 或其它库；镜像内已包含构建与运行所需环境。

## CI/CD

当前前端采用 SSH 直连服务器发布：当 `main` 有新提交（或手动触发）时，GitHub Actions 会登录服务器并在前端目录执行 `git pull` 后重启容器。

- **工作流文件**：`FrontEnd/.github/workflows/deploy.yml`
- **服务器目录**：`~/FrontEnd-0317`
- **重启命令**：`docker compose down && docker compose up -d --build --remove-orphans`
- **所需 Secrets**：
  - `ECS_HOST`
  - `ECS_USER`
  - `ECS_SSH_KEY`

1. **构建镜像**（如需指定后端 API 地址，可传构建参数）：
   ```bash
   docker build -t vue-dashboard-app .
   # 指定后端 API 再构建示例：
   # docker build --build-arg VITE_API_BASE=https://api.example.com --build-arg VITE_USE_MOCK=false -t vue-dashboard-app .
   ```

2. **运行容器**：
   ```bash
   docker run -d -p 80:80 --name vue-dashboard vue-dashboard-app
   ```

3. 浏览器访问服务器 `http://<服务器IP>` 即可。前端会按 `VITE_API_BASE` 请求后端接口（见 `docs/API.md`）。

## 页面流程

1. 登录页 `/` → 输入任意用户名密码点击登录
2. 主页 `/home` → 点击左侧 Channel 卡片
3. 排行榜 `/channel` → 条目旁「讲解」跳转 OpenMAIC 预填；「返回主页」回到工字型主页
