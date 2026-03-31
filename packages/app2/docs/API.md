# 前端接口文档（RESTful）

本文档描述前端调用的后端 API 约定，设计遵循 RESTful 规范：URL 表示资源（名词）、HTTP 方法表示操作。后端需按此规范实现后，将前端环境变量 `VITE_API_BASE` 指向后端地址即可联调。

---

## 1. 通用说明

- **Base URL**：由前端环境变量 `VITE_API_BASE` 配置，例如 `http://localhost:3000`。
- **请求头**：所有请求均带 `Content-Type: application/json`。
- **认证**：创建会话成功后前端将 `token` 存于 `localStorage`，后续需认证的接口可在请求头中携带 `Authorization: Bearer <token>`（当前排行榜接口未要求认证，可按需扩展）。

---

## 2. 认证接口（会话资源）

### 2.1 创建会话（登录）

- **URL**：`POST /api/auth/sessions`
- **语义**：创建一条会话资源，即登录。RESTful 使用名词 `sessions` 表示资源，用 POST 表示创建。
- **请求体**：

```json
{
  "username": "string",
  "password": "string"
}
```

- **成功响应**（HTTP 200）：

```json
{
  "success": true,
  "token": "string",
  "user": {
    "username": "string"
  }
}
```

- **失败响应**（HTTP 401 或其他 4xx/5xx）：

```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

- **说明**：前端根据 `success` 与 `token` 判断是否创建成功，并保存 `token`。

### 2.2 删除当前会话（登出，可选）

- **URL**：`DELETE /api/auth/sessions/current`
- **语义**：删除当前会话资源，即登出。
- **请求头**：`Authorization: Bearer <token>`
- **成功响应**：HTTP 204 No Content 或 HTTP 200 + 空 body。
- **说明**：若后端实现登出接口，前端可在登出时调用并清除本地 `token`。

---

## 3. 排行榜接口（ranks 资源）

排行榜分为两个「榜」：**主榜（频道排行榜）**、**副榜（副频道排行榜）**。每个榜下各有两种列表：**视频榜**、**微博/话题榜**。

| 榜   | 视频榜接口对应展示     | 微博榜接口对应展示 |
|------|------------------------|--------------------|
| main | 创意精选（左列）       | 本周新榜（右列）   |
| sub  | 技能提升（左列）       | 热门推荐（右列）   |

### 3.1 获取视频榜

- **URL**：`GET /api/ranks/:board/video`
- **路径参数**：
  - `board`：`main`（频道排行榜）或 `sub`（副频道排行榜）
- **响应**（HTTP 200）：

```json
{
  "list": [
    {
      "id": 1,
      "title": "string",
      "views": "string"
    }
  ]
}
```

- **字段说明**：
  - `id`：排名序号，从 1 开始。
  - `title`：标题。
  - `views`：播放量展示文案，如 `"128万"`、`"72万"`。
- **条数**：本地 Mock 下视频榜为 **5 条**（`VIDEO_RANK_SIZE`）；真实后端可实现为 **60 条** 并支持分页。

### 3.2 获取微博/话题榜

- **URL**：`GET /api/ranks/:board/weibo`
- **路径参数**：
  - `board`：`main`（本周新榜）或 `sub`（热门推荐）
- **响应**（HTTP 200）：

```json
{
  "list": [
    {
      "id": 1,
      "title": "string",
      "viewsNum": "string",
      "tag": "string"
    }
  ]
}
```

- **字段说明**：
  - `id`：排名序号，从 1 开始。
  - `title`：标题。
  - `viewsNum`：阅读/热度数字字符串，如 `"923847"`。
  - `tag`：标签，如 `"热"`、`"新"` 或空字符串 `""`。
- **条数**：每条榜返回 **60 条**（与视频榜一致）。

---

## 4. 接口一览（RESTful）

| 方法   | 路径                           | 说明               |
|--------|--------------------------------|--------------------|
| POST   | /api/auth/sessions             | 创建会话（登录）   |
| DELETE | /api/auth/sessions/current     | 删除当前会话（登出，可选） |
| GET    | /api/ranks/main/video          | 主榜-创意精选       |
| GET    | /api/ranks/main/weibo          | 主榜-本周新榜       |
| GET    | /api/ranks/sub/video           | 副榜-技能提升       |
| GET    | /api/ranks/sub/weibo           | 副榜-热门推荐       |

---

## 5. 前端 Mock 与联调

- 未配置 `VITE_API_BASE` 时，前端使用内置 Mock 数据（不发起真实请求）。
- 联调时在项目根目录创建 `.env`（可参考 `.env.example`），设置例如：
  - `VITE_API_BASE=http://localhost:3000`
  - `VITE_USE_MOCK=false`
- 重启 `npm run dev` 后，登录与排行榜将请求上述后端接口。
