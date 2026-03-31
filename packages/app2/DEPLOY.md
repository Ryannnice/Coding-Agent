# 前端服务器部署指南

## 后端服务端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| OpenMAIC | 3000 | 教育龙虾课堂生成服务 |
| Crawl | 8000 | AI 新闻采集（本地模式） |
| Crawl Worker | 6600 | 新闻采集 Worker（Docker） |
| Crawl API | 8000 | 榜单、详情、认证与封面相关接口 |
| Workshop | 5000 | URL 生成服务 |

---

## 生产环境部署步骤

### 1. 修改环境变量配置

编辑 `.env.production`，将 `YOUR_SERVER_IP` 替换为实际服务器 IP 或域名：

```bash
# 例如：
VITE_OPENMAIC_BASE_URL=http://192.168.1.100:3000
VITE_OPENMAIC_APP_URL=http://192.168.1.100:3000
```

### 2. 构建前端

```bash
cd /root/internship-szdsjyjy/03-20-v0.1/FrontEnd
npm install
npm run build
```

构建后的文件在 `dist/` 目录。

### 3. 部署方式选择

#### 方式 A：使用环境变量（推荐简单部署）

直接在生产环境构建：

```bash
# 在服务器上执行
export VITE_OPENMAIC_BASE_URL=http://your-server-ip:3000
export VITE_OPENMAIC_APP_URL=http://your-server-ip:3000
npm run build
```

然后将 `dist/` 目录部署到 Web 服务器（Nginx/Apache）。

#### 方式 B：使用 Nginx 反向代理（推荐生产环境）

如果不想修改前端代码，可以配置 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/FrontEnd/dist;
        try_files $uri $uri/ /index.html;
    }

    # OpenMAIC 反向代理
    location /openmaic/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 其他后端服务代理...
}
```

此时前端 `.env.production` 保持：
```
VITE_OPENMAIC_BASE_URL=/openmaic
VITE_OPENMAIC_APP_URL=/openmaic
```

---

## 验证部署

1. **检查 OpenMAIC CORS 是否生效**：
   ```bash
   curl -H "Origin: http://your-frontend-domain" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        -v http://your-server-ip:3000/api/generate-classroom
   ```

2. **检查前端是否能访问 OpenMAIC**：
   打开浏览器开发者工具 → Network → 点击"教育龙虾"按钮，查看请求是否成功。

---

## 常见问题

### Q: 点击"教育龙虾"后报 CORS 错误？
**A**: 确认 OpenMAIC 的 `middleware.ts` 已正确添加，且 OpenMAIC 服务已重启。

### Q: 前端页面空白或 404？
**A**: Vue Router 使用 history 模式，需要配置 Web 服务器的 fallback 到 index.html。

### Q: 如何修改 OpenMAIC 监听地址？
**A**: 修改 `Backend/OpenMAIC/docker-compose.yml`：
```yaml
ports:
  - "0.0.0.0:3000:3000"  # 确保监听所有接口
```

---

## 端口检查清单

部署前请确保：

- [ ] OpenMAIC (3000) 正在运行且监听 0.0.0.0
- [ ] Crawl (8000) 正在运行（如使用本地模式）
- [ ] Crawl Worker (6600) Docker 容器运行中（如使用 Docker）
- [ ] Crawl API (8000) Docker 容器运行中
- [ ] Workshop (5000) Docker 容器运行中（如需要）
- [ ] 服务器防火墙放行相应端口
- [ ] 云服务器安全组放行相应端口
