import { Hono } from 'hono';
import type { Env } from '../env';
import { findUserById, updateUser, listUsers } from '../db';
import { authMiddleware, getAuthUser, requireRole } from '../middleware/auth';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateRandomPassword } from '../utils/shared/utils';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../utils/shared/constants';
import type { ApiResponse, UpdateUserRequest, ChangePasswordRequest, UserListQuery, PaginatedResponse } from '../utils/shared/api';

const users = new Hono<{ Bindings: Env }>();

users.get('/me', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const user = await findUserById(c.env.DB, authUser.userId);
  
  if (!user) {
    return c.json<ApiResponse>({ success: false, error: '用户不存在' }, 404);
  }
  
  return c.json<ApiResponse>({ success: true, data: user });
});

users.put('/me', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const body = await c.req.json<UpdateUserRequest>();
  
  const updates: { realName?: string; avatarUrl?: string | null } = {};
  
  if (body.realName !== undefined) {
    if (!body.realName.trim()) {
      return c.json<ApiResponse>({ success: false, error: '真实姓名不能为空' }, 400);
    }
    updates.realName = body.realName.trim();
  }
  
  if (body.avatarUrl !== undefined) {
    updates.avatarUrl = body.avatarUrl || null;
  }
  
  await updateUser(c.env.DB, authUser.userId, updates);
  
  const user = await findUserById(c.env.DB, authUser.userId);
  return c.json<ApiResponse>({ success: true, data: user });
});

users.post('/me/password', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const body = await c.req.json<ChangePasswordRequest>();
  
  if (!body.oldPassword || !body.newPassword) {
    return c.json<ApiResponse>({ success: false, error: '请填写旧密码和新密码' }, 400);
  }
  
  if (body.newPassword.length < 6) {
    return c.json<ApiResponse>({ success: false, error: '新密码长度至少为6位' }, 400);
  }
  
  const userRow = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(authUser.userId).first();
  if (!userRow) {
    return c.json<ApiResponse>({ success: false, error: '用户不存在' }, 404);
  }
  
  const valid = await verifyPassword(body.oldPassword, userRow.password_hash as string);
  if (!valid) {
    return c.json<ApiResponse>({ success: false, error: '旧密码错误' }, 400);
  }
  
  const passwordHash = await hashPassword(body.newPassword);
  await updateUser(c.env.DB, authUser.userId, { passwordHash });
  
  return c.json<ApiResponse>({ success: true, message: '密码修改成功' });
});

users.get('/', authMiddleware, requireRole('admin'), async (c) => {
  const query = c.req.query() as UserListQuery;
  
  const page = Math.max(1, parseInt(String(query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(String(query.pageSize)) || DEFAULT_PAGE_SIZE));
  
  const result = await listUsers(c.env.DB, {
    page,
    pageSize,
    role: query.role,
    status: query.status,
    classId: query.classId
  });
  
  return c.json<ApiResponse<PaginatedResponse<typeof result.users[0]>>>({
    success: true,
    data: {
      items: result.users,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize)
    }
  });
});

users.get('/:id', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const targetId = c.req.param('id') as string;
  
  if (authUser.userId !== targetId && authUser.role !== 'admin') {
    return c.json<ApiResponse>({ success: false, error: '权限不足' }, 403);
  }
  
  const user = await findUserById(c.env.DB, targetId);
  if (!user) {
    return c.json<ApiResponse>({ success: false, error: '用户不存在' }, 404);
  }
  
  return c.json<ApiResponse>({ success: true, data: user });
});

users.put('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const targetId = c.req.param('id') as string;
  const body = await c.req.json<Partial<{ realName: string; avatarUrl: string | null; role: string }>>();
  
  const user = await findUserById(c.env.DB, targetId);
  if (!user) {
    return c.json<ApiResponse>({ success: false, error: '用户不存在' }, 404);
  }
  
  const updates: { realName?: string; avatarUrl?: string | null } = {};
  
  if (body.realName !== undefined) {
    updates.realName = body.realName.trim();
  }
  if (body.avatarUrl !== undefined) {
    updates.avatarUrl = body.avatarUrl || null;
  }
  
  await updateUser(c.env.DB, targetId, updates);
  
  if (body.role !== undefined && ['admin', 'teacher', 'student'].includes(body.role)) {
    await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(body.role, Math.floor(Date.now() / 1000), targetId)
      .run();
  }
  
  const updatedUser = await findUserById(c.env.DB, targetId);
  return c.json<ApiResponse>({ success: true, data: updatedUser });
});

users.post('/:id/status', authMiddleware, requireRole('admin'), async (c) => {
  const targetId = c.req.param('id') as string;
  const body = await c.req.json<{ action: 'enable' | 'disable' | 'resetPassword' }>();
  
  const user = await findUserById(c.env.DB, targetId);
  if (!user) {
    return c.json<ApiResponse>({ success: false, error: '用户不存在' }, 404);
  }
  
  if (user.role === 'admin' && getAuthUser(c)!.userId !== targetId) {
    return c.json<ApiResponse>({ success: false, error: '不能修改其他管理员的账户' }, 403);
  }
  
  switch (body.action) {
    case 'enable':
      await updateUser(c.env.DB, targetId, { status: 'active' });
      return c.json<ApiResponse>({ success: true, message: '账户已启用' });
    
    case 'disable':
      await updateUser(c.env.DB, targetId, { status: 'inactive' });
      return c.json<ApiResponse>({ success: true, message: '账户已禁用' });
    
    case 'resetPassword':
      const newPassword = generateRandomPassword();
      const passwordHash = await hashPassword(newPassword);
      await updateUser(c.env.DB, targetId, { passwordHash });
      return c.json<ApiResponse<{ newPassword: string }>>({
        success: true,
        data: { newPassword },
        message: '密码已重置，请妥善保管新密码'
      });
    
    default:
      return c.json<ApiResponse>({ success: false, error: '无效的操作' }, 400);
  }
});

export default users;
