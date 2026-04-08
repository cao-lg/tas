# 教学管理通用用户管理系统 - 产品需求文档

## Overview
- **Summary**: 构建一套基于 Cloudflare 免费资源的通用用户管理系统，作为教学机构的中央认证与基础数据平台，实现单点登录、统一组织架构和标准化接入。
- **Purpose**: 解决教学机构多系统身份管理混乱、重复建设的问题，为中小规模教育机构提供零成本的用户管理解决方案。
- **Target Users**: 教师、学生、管理员以及第三方课程/考评系统开发者。

## Goals
- 实现完整的用户认证系统（注册、登录、登出、Token 验证）
- 提供班级管理功能（创建班级、成员管理、班级代码邀请）
- 支持第三方应用接入（应用注册、权限验证）
- 构建适配 PC/平板/手机的管理后台前端
- 完全基于 Cloudflare 免费资源，零绑卡、零成本运行

## Non-Goals (Out of Scope)
- 不支持文件存储（头像使用外部 URL 方案）
- 不提供高级数据分析功能
- 不支持多语言国际化
- 不包含短信/邮件通知功能
- 不支持支付或计费功能

## Background & Context
- 教学机构常需同时使用多套独立的课程教学与考评系统
- 重复建设导致管理成本高、用户体验差
- Cloudflare 提供的免费资源（Workers、D1、KV、Pages）为零成本方案提供可能
- 规避 R2 绑卡限制，采用纯 API 头像服务与 KV 暂存方案

## Functional Requirements
- **FR-1**: 用户认证模块（注册、登录、登出、Token 验证）
- **FR-2**: 用户管理模块（个人信息维护、管理员用户管理）
- **FR-3**: 班级管理模块（创建班级、成员管理、班级代码邀请）
- **FR-4**: 应用管理模块（注册应用、权限验证）
- **FR-5**: 管理后台前端（登录/注册、仪表盘、班级管理、用户管理、应用管理、个人设置）

## Non-Functional Requirements
- **NFR-1**: 性能要求：API 响应时间 95% 在 500ms 内，前端首屏加载 < 2 秒
- **NFR-2**: 安全性：所有 API 必须 HTTPS 传输，密码 bcrypt 加密，JWT 签名验证
- **NFR-3**: 可用性：服务可用性目标 99.5%（依赖 Cloudflare 全球网络）
- **NFR-4**: 可维护性：TypeScript 完整类型定义，模块化代码结构

## Constraints
- **Technical**: Cloudflare 免费额度限制（Workers 请求数、D1 读写次数）
- **Business**: 零成本方案，不使用需绑卡服务
- **Dependencies**: Cloudflare Workers、D1、KV、Pages 服务

## Assumptions
- 目标用户规模为 0-5000 用户
- 第三方应用开发者具备基本的 API 集成能力
- 前端部署在 Cloudflare Pages，后端为 Cloudflare Workers
- JWT 密钥通过 Cloudflare Secrets 安全管理

## Acceptance Criteria

### AC-1: 用户注册功能
- **Given**: 新用户访问注册页面
- **When**: 输入有效邮箱、用户名、真实姓名、密码
- **Then**: 成功创建账户并自动登录
- **Verification**: `programmatic`
- **Notes**: 需验证邮箱和用户名唯一性

### AC-2: 用户登录功能
- **Given**: 已注册用户访问登录页面
- **When**: 输入有效账号（用户名或邮箱）和密码
- **Then**: 成功登录并返回 JWT Token
- **Verification**: `programmatic`
- **Notes**: Token 有效期 7 天

### AC-3: 班级创建功能
- **Given**: 教师或管理员登录系统
- **When**: 填写班级名称、描述、学年
- **Then**: 成功创建班级并成为班级教师
- **Verification**: `programmatic`
- **Notes**: 自动生成 6 位唯一班级代码

### AC-4: 班级加入功能
- **Given**: 登录用户输入班级代码
- **When**: 班级代码有效且未加入过
- **Then**: 成功加入班级
- **Verification**: `programmatic`

### AC-5: 应用注册功能
- **Given**: 管理员登录系统
- **When**: 填写应用名称、回调 URL、描述
- **Then**: 成功创建应用并返回 app_key 和 app_secret
- **Verification**: `programmatic`
- **Notes**: Secret 仅展示一次

### AC-6: 前端响应式布局
- **Given**: 用户在不同设备（PC/平板/手机）访问系统
- **When**: 调整屏幕尺寸
- **Then**: 界面自适应，操作流畅
- **Verification**: `human-judgment`

## Open Questions
- [ ] 第三方应用的具体接入流程文档是否需要详细说明？
- [ ] 是否需要提供 API 文档（如 OpenAPI 规范）？
- [ ] 系统监控和告警机制如何实现？
- [ ] 数据备份和恢复策略是否需要考虑？
