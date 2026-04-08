# TAS 系统部署指南（为 56170496@qq.com 准备）

## 📋 准备信息

- **GitHub 仓库**：https://github.com/cao-lg/tas.git
- **Cloudflare 账号**：56170496@qq.com
- **Cloudflare 密码**：Caolg.123
- **JWT_SECRET**：70d50176ad65b581483a36d02496e152b3d2f570928af2ffa14d4308ba46b7e6

## 🚀 部署步骤

### 1. 登录 Cloudflare 控制台

1. 打开浏览器，访问：https://dash.cloudflare.com/login
2. 输入账号：`56170496@qq.com`
3. 输入密码：`Caolg.123`
4. 完成登录

### 2. 创建 Cloudflare 资源

#### 创建 D1 数据库

1. 访问：https://dash.cloudflare.com/?to=/:account/d1/databases
2. 点击「创建数据库」
3. 数据库名称：`tas-db`
4. 点击「创建」
5. 记录生成的 `database_id`

#### 创建 KV 命名空间

1. 访问：https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces
2. 点击「创建命名空间」
3. 命名空间名称：`tas-kv`
4. 点击「创建」
5. 记录生成的 `namespace id`

### 3. 配置 wrangler.toml

1. 访问 GitHub 仓库：https://github.com/cao-lg/tas.git
2. 打开 `packages/worker/wrangler.toml` 文件
3. 点击「编辑」按钮
4. 替换以下占位符：

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
JWT_SECRET = "70d50176ad65b581483a36d02496e152b3d2f570928af2ffa14d4308ba46b7e6"  # 已生成，直接使用
```

5. 点击「提交更改」

### 4. 部署后端 Worker

1. 访问：https://dash.cloudflare.com/?to=/:account/workers/services
2. 点击「创建服务」
3. 服务名称：`tas-worker`
4. 选择「HTTP Router」
5. 点击「创建服务」
6. 选择「部署」→「从 Git 部署」
7. 连接到 GitHub 仓库：`cao-lg/tas`
8. 分支：`main`
9. 构建命令：`npm run build:worker`
10. 点击「部署」

### 5. 执行数据库迁移

1. 在 Worker 服务页面，点击「设置」→「D1 数据库」
2. 点击「连接数据库」，选择 `tas-db`
3. 点击「控制台」
4. 复制粘贴以下 SQL 代码并执行：

```sql
-- 创建 users 表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  real_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 创建 classes 表
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  academic_year TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 创建 class_members 表
CREATE TABLE IF NOT EXISTS class_members (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_class TEXT NOT NULL CHECK (role_in_class IN ('teacher', 'student', 'assistant')),
  joined_at INTEGER NOT NULL,
  UNIQUE(class_id, user_id)
);

-- 创建 applications 表
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  app_key TEXT UNIQUE NOT NULL,
  app_secret TEXT NOT NULL,
  callback_url TEXT,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at INTEGER NOT NULL
);

-- 创建 app_authorizations 表
CREATE TABLE IF NOT EXISTS app_authorizations (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions TEXT,
  authorized_at INTEGER NOT NULL,
  UNIQUE(app_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(code);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by);
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_app_key ON applications(app_key);
CREATE INDEX IF NOT EXISTS idx_applications_owner_id ON applications(owner_id);
CREATE INDEX IF NOT EXISTS idx_app_authorizations_app_id ON app_authorizations(app_id);
CREATE INDEX IF NOT EXISTS idx_app_authorizations_user_id ON app_authorizations(user_id);
```

### 6. 部署前端到 Cloudflare Pages

1. 访问：https://dash.cloudflare.com/?to=/:account/pages/projects
2. 点击「创建项目」
3. 连接到 GitHub 仓库：`cao-lg/tas`
4. 项目名称：`tas-frontend`
5. 分支：`main`
6. 构建设置：
   - 构建命令：`npm run build:frontend`
   - 输出目录：`packages/frontend/dist`
7. 点击「保存并部署」

### 7. 配置 CORS

1. 在 Worker 服务页面，点击「设置」→「变量」
2. 添加环境变量：
   - 名称：`CORS_ORIGINS`
   - 值：`*` 或您的前端 Pages 地址
3. 点击「保存」

### 8. 验证部署

1. 访问前端 Pages 地址（类似于：`tas-frontend.pages.dev`）
2. 点击「注册」创建管理员账户
3. 登录系统
4. 测试各项功能是否正常

## 🛠️ 常用操作

### 查看数据库数据

1. 在 D1 数据库页面，点击「控制台」
2. 执行 SQL 查询：
   ```sql
   SELECT * FROM users;
   SELECT * FROM classes;
   ```

### 查看 Worker 日志

1. 在 Worker 服务页面，点击「日志」
2. 查看实时日志

### 重新部署

1. 对代码进行修改并提交到 GitHub
2. Cloudflare 会自动重新部署

## 📚 相关链接

- **GitHub 仓库**：https://github.com/cao-lg/tas.git
- **Cloudflare 控制台**：https://dash.cloudflare.com
- **D1 数据库**：https://dash.cloudflare.com/?to=/:account/d1/databases
- **KV 命名空间**：https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces
- **Worker 服务**：https://dash.cloudflare.com/?to=/:account/workers/services
- **Pages 项目**：https://dash.cloudflare.com/?to=/:account/pages/projects

## 🔐 安全提示

- 不要在公开场合分享您的 Cloudflare 账号密码
- 定期更改密码
- 启用双因素认证以提高安全性

部署完成后，您就可以开始使用 TAS 系统了！🚀
