# TAS 系统快速部署指南

## 📋 前置条件

- GitHub 仓库已创建并推送完成：https://github.com/cao-lg/tas.git
- Cloudflare 账户已激活 GitHub 授权

## 🚀 部署步骤

### 1. 登录 Wrangler

在项目根目录运行：

```bash
cd /workspace
npx wrangler login
```

这会打开浏览器进行 Cloudflare 授权。

### 2. 创建 Cloudflare 资源

#### 创建 D1 数据库

```bash
npx wrangler d1 create tas-db
```

创建成功后，会返回 database_id，将其复制。

#### 创建 KV 命名空间

```bash
npx wrangler kv namespace create "tas-kv"
```

创建成功后，会返回 namespace id，将其复制。

### 3. 配置 wrangler.toml

编辑 `packages/worker/wrangler.toml`，替换以下占位符：

```toml
[[d1_databases]]
binding = "DB"
database_name = "tas-db"
database_id = "YOUR_D1_DATABASE_ID"  # 替换为实际的 database_id

[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"  # 替换为实际的 namespace id

[vars]
ENVIRONMENT = "production"
JWT_SECRET = "YOUR_JWT_SECRET_KEY"  # 替换为一个强随机密钥
```

生成 JWT_SECRET 的方法：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 执行数据库迁移

```bash
npx wrangler d1 migrations apply tas-db --remote
```

或者使用 npm 脚本：
```bash
npm run db:migrate
```

### 5. 部署后端 Worker

```bash
npm run deploy:worker
```

部署成功后会返回 Worker 的访问地址，例如：
`https://tas-worker.your-subdomain.workers.dev`

### 6. 配置前端 API 地址

编辑 `packages/frontend/vite.config.ts`，在生产环境配置中设置正确的 API 地址：

```typescript
// 仅在开发环境使用代理
// 生产环境需要部署到同一域名或配置 CORS
```

### 7. 构建前端

```bash
npm run build:frontend
```

### 8. 部署前端到 Cloudflare Pages

有两种方式：

#### 方式 A：使用 Wrangler CLI 部署

```bash
cd packages/frontend
npx wrangler pages deploy dist
```

#### 方式 B：通过 GitHub 自动部署（推荐）

1. 访问 https://pages.cloudflare.com
2. 创建新项目，连接到 GitHub 仓库 https://github.com/cao-lg/tas.git
3. 配置构建设置：
   - 构建命令：`npm run build:frontend`
   - 输出目录：`packages/frontend/dist`
4. 配置环境变量（如需要）

### 9. 配置 CORS（如需要）

如果前端和后端部署在不同域名，需要在 Cloudflare Pages 中配置 CORS，或者在 Worker 中添加允许的域名。

## 📝 验证部署

1. 访问前端 Pages 地址
2. 尝试注册新用户
3. 登录并测试各项功能
4. 检查 API 请求是否正常

## 🛠️ 常用命令

```bash
# 查看 Worker 日志
npx wrangler tail

# 查看数据库
npx wrangler d1 execute tas-db --command="SELECT * FROM users"

# 本地开发
npm run dev
```

## 🔐 安全提示

- 永远不要将包含真实密钥的 wrangler.toml 提交到 GitHub
- 使用环境变量或 Cloudflare Secrets 管理敏感信息
- 定期轮换 JWT_SECRET 和其他密钥

## 📚 更多信息

详细部署文档请参考 [DEPLOY.md](file:///workspace/DEPLOY.md)
