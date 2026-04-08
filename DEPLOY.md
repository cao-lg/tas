# TAS 系统部署文档

## 概述

本部署文档介绍如何将教学管理通用用户管理系统（TAS）部署到 Cloudflare 平台，包括 Worker 后端和前端部署。

## 前置条件

在开始部署前，请确保您已完成以下准备工作：

1. **Cloudflare 账号**：已注册并登录 Cloudflare 账号
2. **Wrangler CLI**：已安装 Wrangler CLI 工具
3. **Node.js**：环境已安装 Node.js 18+ 和 npm
4. **Git**：项目代码已克隆到本地

---

## 部署步骤总览

本系统包含两个主要组件：

1. **Worker 后端**：部署到 Cloudflare Workers
2. **前端应用**：构建后部署到 Cloudflare Pages 或其他静态托管服务

---

## 详细部署步骤

### 第一步：环境准备

1. 克隆或导航到项目根目录

```bash
cd /workspace
```

2. 安装项目依赖

```bash
npm install
```

3. 登录 Cloudflare Wrangler

```bash
npx wrangler login
```

---

### 第二步：创建 Cloudflare 资源

#### 2.1 创建 D1 数据库

```bash
npx wrangler d1 create tas-db
```

复制输出中的数据库 ID，后续配置会用到。

#### 2.2 创建 KV 命名空间

```bash
npx wrangler kv:namespace create tas-kv
```

复制输出中的命名空间 ID，后续配置会用到。

---

### 第三步：配置 wrangler.toml

编辑 `packages/worker/wrangler.toml` 文件，替换以下占位符：

```toml
[[d1_databases]]
binding = "DB"
database_name = "tas-db"
database_id = "YOUR_D1_DATABASE_ID"  # 替换为实际的 D1 数据库 ID

[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"  # 替换为实际的 KV 命名空间 ID

[vars]
ENVIRONMENT = "production"
JWT_SECRET = "YOUR_JWT_SECRET_KEY"  # 替换为随机生成的强密码/密钥
```

**生成 JWT_SECRET 建议：**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 第四步：应用数据库迁移

```bash
npm run db:migrate
```

或者直接使用 wrangler 命令：

```bash
npx wrangler d1 migrations apply tas-db --remote
```

---

### 第五步：部署 Worker 后端

1. 构建项目

```bash
npm run build
```

2. 部署到 Cloudflare Workers

```bash
npm run deploy:worker
```

部署成功后，您将获得 Worker 的访问 URL，格式类似：

```
https://tas-worker.<your-subdomain>.workers.dev
```

---

### 第六步：配置前端 API 地址

更新前端 API 地址配置。编辑 `packages/shared/src/constants.ts` 或相关配置文件，将 API_BASE_URL 更新为您的 Worker URL。

---

### 第七步：构建前端应用

```bash
npm run build:frontend
```

构建产物将生成在 `packages/frontend/dist` 目录。

---

### 第八步：部署前端应用

您可以选择以下任一方式部署前端：

#### 选项 A：Cloudflare Pages

1. 使用 Wrangler 创建 Pages 项目：

```bash
cd packages/frontend
npx wrangler pages project create tas-frontend
```

2. 部署到 Pages：

```bash
npx wrangler pages deploy dist
```

#### 选项 B：其他静态托管服务

将 `packages/frontend/dist` 目录的内容上传到您选择的静态托管服务（如 Vercel、Netlify、GitHub Pages 等）。

---

## 项目可用脚本

在项目根目录下，可以使用以下 npm 脚本：

```json
{
  "dev": "同时启动 Worker 和前端开发服务器",
  "dev:worker": "仅启动 Worker 开发服务器",
  "dev:frontend": "仅启动前端开发服务器",
  "build": "构建所有包",
  "build:worker": "仅构建 Worker",
  "build:frontend": "仅构建前端",
  "deploy:worker": "部署 Worker 到 Cloudflare",
  "deploy:frontend": "部署前端（需要在 packages/frontend 目录配置",
  "db:migrate": "应用数据库迁移",
  "typecheck": "运行类型检查"
}
```

---

## 验证部署

部署完成后，请按照以下步骤验证：

1. 访问前端应用 URL，确认页面正常加载
2. 尝试注册新用户
3. 尝试登录系统
4. 验证各项功能正常工作

---

## 常见问题

### 问题：数据库迁移失败

**解决方案**：检查 wrangler.toml 中的 database_id 是否正确配置

### 问题：JWT 认证失败

**解决方案**：确保 JWT_SECRET 已正确配置且足够复杂

### 问题：前端无法连接到后端 API

**解决方案**：检查前端配置中的 API_BASE_URL 是否正确配置为 Worker 的 URL

---

## 下一步

部署完成后，请参考 [上线检查清单](./DEPLOY_CHECKLIST.md) 进行最终的上线验证。
