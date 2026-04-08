# TAS 系统回滚计划与备份策略

## 概述

本文档详细描述了 TAS 系统的备份策略和回滚计划，确保在出现问题时能够快速恢复系统正常运行。

---

## 一、备份策略

### 1.1 数据库备份

#### 备份频率

- **完整备份**：每天凌晨 2:00 自动执行
- **增量备份**：每小时执行一次（如支持）
- **部署前备份**：每次部署前手动触发

#### 备份内容

- D1 数据库完整数据快照
- 数据库 schema 定义
- 索引和约束配置

#### 备份保留策略

- **每日完整备份**：保留 7 天
- **部署前备份**：保留 30 天
- **重要里程碑备份**：永久保留

#### 备份方法

使用 Cloudflare Wrangler 命令行工具：

```bash
# 创建数据库导出（当前 Cloudflare D1 不支持直接导出，使用以下方式）
npx wrangler d1 execute tas-db --remote --command "SELECT * FROM users" > backup_users_$(date +%Y%m%d).sql
npx wrangler d1 execute tas-db --remote --command "SELECT * FROM classes" > backup_classes_$(date +%Y%m%d).sql
npx wrangler d1 execute tas-db --remote --command "SELECT * FROM class_members" > backup_class_members_$(date +%Y%m%d).sql
npx wrangler d1 execute tas-db --remote --command "SELECT * FROM applications" > backup_applications_$(date +%Y%m%d).sql
npx wrangler d1 execute tas-db --remote --command "SELECT * FROM app_authorizations" > backup_app_authorizations_$(date +%Y%m%d).sql
```

### 1.2 KV 存储备份

#### 备份频率

- 与数据库备份同步执行
- 每次部署前备份

#### 备份方法

```bash
# 列出所有 key
npx wrangler kv:key list --binding=KV --namespace-id=YOUR_KV_NAMESPACE_ID > kv_keys_$(date +%Y%m%d).json

# 导出所有 key-value 对（需要编写脚本）
```

### 1.3 配置文件备份

#### 备份内容

- wrangler.toml
- 环境变量配置
- 前端配置文件

#### 备份方法

使用 Git 版本控制：

```bash
# 提交配置变更
git add packages/worker/wrangler.toml
git commit -m "Backup configuration before deployment"
git tag deploy-$(date +%Y%m%d-%H%M%S)
```

### 1.4 代码备份

使用 Git 作为代码备份工具：

- 所有代码变更提交到 Git 仓库
- 重要部署创建 Git Tag
- 保持至少 2 个远程备份（如 GitHub + GitLab）

---

## 二、回滚计划

### 2.1 回滚触发条件

出现以下情况之一时，需要考虑回滚：

1. **严重功能故障**：核心功能无法正常使用
2. **数据损坏**：发现数据不一致或丢失
3. **性能严重下降**：系统响应时间超过阈值 50%
4. **安全漏洞**：发现严重安全问题
5. **用户影响广泛**：超过 20% 的用户受到影响

### 2.2 回滚决策流程

1. **问题发现与确认**
   - 收集错误日志
   - 确认影响范围
   - 评估严重程度

2. **紧急修复评估**
   - 是否可以快速修复（< 30 分钟）
   - 修复是否有风险
   - 是否有临时解决方案

3. **回滚决策**
   - 如无法快速修复，决策回滚
   - 通知相关人员
   - 记录回滚原因

### 2.3 回滚步骤

#### 场景 A：Worker 代码回滚

1. **确认回滚目标版本**
   ```bash
   # 查看部署历史
   npx wrangler versions list --name tas-worker
   ```

2. **执行回滚**
   ```bash
   # 回滚到上一个版本
   npx wrangler versions rollback --name tas-worker
   
   # 或回滚到指定版本
   npx wrangler versions deploy --version-id <version-id> --name tas-worker
   ```

3. **验证回滚**
   - 访问 Worker URL 确认服务正常
   - 检查日志确认无错误
   - 验证核心功能正常

#### 场景 B：前端应用回滚

**Cloudflare Pages 回滚：**

1. 登录 Cloudflare Dashboard
2. 导航到 Pages 项目
3. 选择 "Deployments"
4. 找到之前的成功部署
5. 点击 "..." 菜单，选择 "Promote to production"

**其他托管服务：**

根据具体平台的回滚机制执行，通常需要重新部署之前的构建版本。

#### 场景 C：数据库回滚

**重要：数据库回滚可能导致数据丢失，请谨慎操作！**

1. **停止写入操作**（如可能）
   - 临时将 Worker 设置为维护模式
   - 通知用户系统暂时不可用

2. **确认当前状态**
   - 记录当前数据库状态
   - 确认要恢复的备份点

3. **执行恢复**
   - Cloudflare D1 当前不支持直接恢复，需要：
     a. 创建新的 D1 数据库
     b. 应用迁移脚本
     c. 从备份中手动导入数据
     d. 更新 wrangler.toml 中的 database_id
     e. 重新部署 Worker

4. **验证数据完整性**
   - 检查关键数据是否完整
   - 验证数据一致性
   - 运行功能测试

### 2.4 回滚后检查清单

- [ ] Worker 服务正常运行
- [ ] 前端应用可正常访问
- [ ] 数据库连接正常
- [ ] 核心功能验证通过
- [ ] 用户可以正常登录
- [ ] API 响应正常
- [ ] 日志无错误
- [ ] 性能指标恢复正常
- [ ] 监控告警已清除
- [ ] 用户反馈确认问题已解决
- [ ] 回滚记录已更新

---

## 三、应急响应流程

### 3.1 应急联系人

| 角色 | 姓名 | 联系方式 | 职责 |
|------|------|----------|------|
| 技术负责人 | | | 最终决策 |
| 后端开发 | | | Worker 相关问题 |
| 前端开发 | | | 前端相关问题 |
| 运维人员 | | | 基础设施问题 |

### 3.2 应急通讯渠道

- 主通讯：即时通讯工具（如 Slack、钉钉、企业微信）
- 备用：电话会议
- 状态更新：每 30 分钟更新一次

### 3.3 问题升级流程

1. **第一级**：开发人员自行处理（30 分钟内）
2. **第二级**：通知技术负责人（30-60 分钟）
3. **第三级**：启动应急响应团队（> 60 分钟）
4. **第四级**：通知用户并提供预计恢复时间（> 2 小时）

---

## 四、维护模式

### 4.1 启用维护模式

在需要进行数据库操作或重大变更时，可以启用维护模式：

1. 创建一个简单的维护页面
2. 更新 Worker 返回维护页面
3. 或在前端添加维护模式提示

### 4.2 维护模式通知

- 在系统主页显示维护通知
- 提供预计恢复时间
- 如有必要，通过邮件或其他渠道通知用户

---

## 五、事后复盘

### 5.1 复盘会议

回滚完成后 24 小时内召开复盘会议，讨论：

- 问题根本原因
- 回滚过程中的经验教训
- 如何预防类似问题再次发生
- 需要改进的流程和工具

### 5.2 复盘报告

编写复盘报告，包含：

- 问题描述
- 影响范围
- 处理过程
- 根本原因分析
- 改进措施
- 行动项和负责人

---

## 六、测试与演练

### 6.1 定期演练

每季度进行一次回滚演练：

1. 在测试环境模拟故障
2. 执行回滚流程
3. 记录时间和问题
4. 优化回滚流程

### 6.2 备份验证

每月验证一次备份的可用性：

1. 从备份中恢复数据到测试环境
2. 验证数据完整性
3. 测试功能是否正常

---

## 附录

### A. 常用命令速查

```bash
# Worker 相关
npx wrangler versions list --name tas-worker
npx wrangler versions rollback --name tas-worker
npx wrangler tail --name tas-worker

# 数据库相关
npx wrangler d1 info tas-db
npx wrangler d1 execute tas-db --remote --command "SELECT * FROM users LIMIT 10"

# KV 相关
npx wrangler kv:key list --binding=KV --namespace-id=YOUR_KV_NAMESPACE_ID
```

### B. 监控指标阈值

| 指标 | 警告阈值 | 危险阈值 |
|------|----------|----------|
| API 响应时间 | > 500ms | > 2000ms |
| 错误率 | > 1% | > 5% |
| 数据库查询时间 | > 100ms | > 500ms |

### C. 参考文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/kv/)
- [部署文档](./DEPLOY.md)
- [上线检查清单](./DEPLOY_CHECKLIST.md)
