# 教学管理通用用户管理系统 - 实现计划

## [x] Task 1: 创建项目基础结构和配置文件
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 创建 monorepo 项目结构
  - 配置 package.json、tsconfig.json 等基础文件
  - 设置 Cloudflare Workers、Pages 项目配置
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `programmatic` TR-1.1: 项目结构符合设计要求
  - `programmatic` TR-1.2: 所有依赖安装成功
- **Notes**: 采用 npm workspaces 管理多包结构

## [x] Task 2: 设计并创建 D1 数据库迁移文件
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 设计数据库表结构（users、classes、class_members、applications、app_authorizations）
  - 创建初始迁移文件
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `programmatic` TR-2.1: 迁移文件语法正确
  - `programmatic` TR-2.2: 表结构符合设计规范
- **Notes**: 包含必要的索引和外键约束

## [x] Task 3: 实现共享类型定义 (shared package)
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 定义核心类型（User、Class、Application 等）
  - 定义 API 请求/响应类型
  - 提供常量和工具函数
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `programmatic` TR-3.1: 类型定义完整且无错误
  - `programmatic` TR-3.2: 工具函数功能正常
- **Notes**: 确保类型定义与数据库结构一致

## [x] Task 4: 实现 Worker 后端 - 认证模块
- **Priority**: P0
- **Depends On**: Task 2, Task 3
- **Description**: 
  - 实现用户注册、登录、登出、Token 验证
  - 集成 JWT 签发与验证
  - 实现密码加密与验证
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**: 
  - `programmatic` TR-4.1: 注册接口返回 200 且创建用户
  - `programmatic` TR-4.2: 登录接口返回 200 且包含 JWT Token
  - `programmatic` TR-4.3: 登出接口正确注销会话
  - `programmatic` TR-4.4: Token 验证接口正确验证 JWT
- **Notes**: 使用 bcryptjs 加密密码，JWT 有效期 7 天

## [x] Task 5: 实现 Worker 后端 - 用户管理模块
- **Priority**: P0
- **Depends On**: Task 4
- **Description**: 
  - 实现个人信息查看/修改
  - 实现密码修改
  - 实现管理员用户列表/状态管理
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `programmatic` TR-5.1: 个人信息修改接口正常
  - `programmatic` TR-5.2: 密码修改接口正常
  - `programmatic` TR-5.3: 管理员用户列表接口返回正确数据
- **Notes**: 管理员可禁用/启用用户、重置密码

## [x] Task 6: 实现 Worker 后端 - 班级管理模块
- **Priority**: P0
- **Depends On**: Task 4
- **Description**: 
  - 实现创建/编辑/删除班级
  - 实现班级代码加入功能
  - 实现成员管理（添加/移除）
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**: 
  - `programmatic` TR-6.1: 班级创建接口返回 200
  - `programmatic` TR-6.2: 班级加入接口验证代码并添加成员
  - `programmatic` TR-6.3: 成员管理接口正确添加/移除成员
- **Notes**: 教师可管理班级，学生只能通过代码加入

## [x] Task 7: 实现 Worker 后端 - 应用管理模块
- **Priority**: P0
- **Depends On**: Task 4
- **Description**: 
  - 实现应用注册/编辑/删除
  - 实现应用状态管理
  - 实现应用权限验证
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**: 
  - `programmatic` TR-7.1: 应用注册接口返回 app_key 和 app_secret
  - `programmatic` TR-7.2: 应用状态管理接口正常
  - `programmatic` TR-7.3: 权限验证接口正确验证 JWT 和应用密钥
- **Notes**: app_secret 仅创建时展示一次

## [x] Task 8: 实现前端管理后台 - 基础布局和路由
- **Priority**: P0
- **Depends On**: Task 3
- **Description**: 
  - 创建 React 项目基础结构
  - 实现响应式布局
  - 配置路由和导航
  - 实现认证上下文
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `programmatic` TR-8.1: 路由配置正确
  - `human-judgment` TR-8.2: 布局在不同设备上显示正常
- **Notes**: 使用 React Router 和 Tailwind CSS

## [x] Task 9: 实现前端管理后台 - 登录/注册页面
- **Priority**: P0
- **Depends On**: Task 4, Task 8
- **Description**: 
  - 实现登录表单
  - 实现注册表单
  - 集成后端认证接口
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**: 
  - `programmatic` TR-9.1: 登录表单正确提交并处理响应
  - `programmatic` TR-9.2: 注册表单正确提交并处理响应
  - `human-judgment` TR-9.3: 表单验证和错误提示友好
- **Notes**: 支持邮箱或用户名登录

## [x] Task 10: 实现前端管理后台 - 仪表盘页面
- **Priority**: P1
- **Depends On**: Task 8
- **Description**: 
  - 实现欢迎卡片
  - 实现统计概览（班级、用户、应用数量）
  - 实现快捷操作
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `human-judgment` TR-10.1: 页面布局美观
  - `programmatic` TR-10.2: 数据加载正确
- **Notes**: 根据用户角色显示不同内容

## [x] Task 11: 实现前端管理后台 - 班级管理页面
- **Priority**: P1
- **Depends On**: Task 6, Task 8
- **Description**: 
  - 实现班级列表
  - 实现创建班级表单
  - 实现班级详情和成员管理
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**: 
  - `programmatic` TR-11.1: 班级列表加载正确
  - `programmatic` TR-11.2: 创建班级功能正常
  - `programmatic` TR-11.3: 成员管理功能正常
- **Notes**: 教师可查看班级代码并管理成员

## [x] Task 12: 实现前端管理后台 - 用户管理页面 (管理员)
- **Priority**: P1
- **Depends On**: Task 5, Task 8
- **Description**: 
  - 实现用户列表和筛选
  - 实现用户状态管理
  - 实现用户编辑
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `programmatic` TR-12.1: 用户列表加载正确
  - `programmatic` TR-12.2: 状态管理功能正常
- **Notes**: 仅管理员可见

## [x] Task 13: 实现前端管理后台 - 应用管理页面 (管理员)
- **Priority**: P1
- **Depends On**: Task 7, Task 8
- **Description**: 
  - 实现应用列表
  - 实现注册应用表单
  - 实现应用详情和凭证管理
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**: 
  - `programmatic` TR-13.1: 应用列表加载正确
  - `programmatic` TR-13.2: 注册应用功能正常
  - `human-judgment` TR-13.3: 凭证展示安全合理
- **Notes**: 仅管理员可见，app_secret 仅创建时展示

## [x] Task 14: 实现前端管理后台 - 个人设置页面
- **Priority**: P1
- **Depends On**: Task 5, Task 8
- **Description**: 
  - 实现个人信息修改
  - 实现密码修改
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `programmatic` TR-14.1: 个人信息修改功能正常
  - `programmatic` TR-14.2: 密码修改功能正常
- **Notes**: 支持外部头像 URL

## [x] Task 15: 编写部署文档和配置说明
- **Priority**: P2
- **Depends On**: Task 7, Task 14
- **Description**: 
  - 编写 Cloudflare 部署步骤
  - 配置说明（D1、KV、Secrets）
  - 集成指南
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**: 
  - `human-judgment` TR-15.1: 文档完整且清晰
  - `human-judgment` TR-15.2: 部署步骤可执行
- **Notes**: 包含常见问题处理
