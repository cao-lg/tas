import { Hono } from 'hono';
import type { Env } from '../env';
import {
  findApplicationById,
  findApplicationByKey,
  createApplication,
  updateApplication,
  deleteApplication,
  listApplications,
  findUserById
} from '../db';
import { authMiddleware, getAuthUser, requireRole } from '../middleware/auth';
import { verifyToken, checkSession } from '../utils/jwt';
import { generateId, generateAppKey, generateAppSecret } from '../utils/shared/utils';
import { APP_KEY_LENGTH, APP_SECRET_LENGTH } from '../utils/shared/constants';
import type { ApiResponse, CreateAppRequest, UpdateAppRequest } from '../utils/shared/api';

const apps = new Hono<{ Bindings: Env }>();

apps.get('/', authMiddleware, requireRole('admin'), async (c) => {
  const appList = await listApplications(c.env.DB);
  
  return c.json<ApiResponse>({
    success: true,
    data: appList.map(app => ({
      id: app.id,
      name: app.name,
      appKey: app.appKey,
      callbackUrl: app.callbackUrl,
      description: app.description,
      status: app.status,
      createdAt: app.createdAt
    }))
  });
});

apps.post('/', authMiddleware, requireRole('admin'), async (c) => {
  const authUser = getAuthUser(c)!;
  const body = await c.req.json<CreateAppRequest>();
  
  if (!body.name?.trim()) {
    return c.json<ApiResponse>({ success: false, error: '应用名称不能为空' }, 400);
  }
  
  const app = await createApplication(c.env.DB, {
    id: generateId(),
    name: body.name.trim(),
    appKey: generateAppKey(APP_KEY_LENGTH),
    appSecret: generateAppSecret(APP_SECRET_LENGTH),
    callbackUrl: body.callbackUrl?.trim() || null,
    description: body.description?.trim() || null,
    ownerId: authUser.userId,
    status: 'active'
  });
  
  return c.json<ApiResponse<{
    id: string;
    name: string;
    appKey: string;
    appSecret: string;
    callbackUrl: string | null;
    description: string | null;
    status: string;
    createdAt: number;
  }>>({
    success: true,
    data: {
      id: app.id,
      name: app.name,
      appKey: app.appKey,
      appSecret: app.appSecret,
      callbackUrl: app.callbackUrl,
      description: app.description,
      status: app.status,
      createdAt: app.createdAt
    },
    message: '应用创建成功，请妥善保管 App Secret，此信息仅显示一次'
  });
});

apps.get('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const appId = c.req.param('id') as string;
  const app = await findApplicationById(c.env.DB, appId);
  
  if (!app) {
    return c.json<ApiResponse>({ success: false, error: '应用不存在' }, 404);
  }
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      id: app.id,
      name: app.name,
      appKey: app.appKey,
      callbackUrl: app.callbackUrl,
      description: app.description,
      status: app.status,
      createdAt: app.createdAt
    }
  });
});

apps.put('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const appId = c.req.param('id') as string;
  const body = await c.req.json<UpdateAppRequest>();
  
  const app = await findApplicationById(c.env.DB, appId);
  if (!app) {
    return c.json<ApiResponse>({ success: false, error: '应用不存在' }, 404);
  }
  
  const updates: { name?: string; description?: string | null; callbackUrl?: string | null } = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description.trim() || null;
  if (body.callbackUrl !== undefined) updates.callbackUrl = body.callbackUrl.trim() || null;
  
  await updateApplication(c.env.DB, appId, updates);
  
  const updated = await findApplicationById(c.env.DB, appId);
  return c.json<ApiResponse>({
    success: true,
    data: {
      id: updated!.id,
      name: updated!.name,
      appKey: updated!.appKey,
      callbackUrl: updated!.callbackUrl,
      description: updated!.description,
      status: updated!.status,
      createdAt: updated!.createdAt
    }
  });
});

apps.post('/:id/status', authMiddleware, requireRole('admin'), async (c) => {
  const appId = c.req.param('id') as string;
  const body = await c.req.json<{ status: 'active' | 'inactive' }>();
  
  if (!['active', 'inactive'].includes(body.status)) {
    return c.json<ApiResponse>({ success: false, error: '无效的状态' }, 400);
  }
  
  const app = await findApplicationById(c.env.DB, appId);
  if (!app) {
    return c.json<ApiResponse>({ success: false, error: '应用不存在' }, 404);
  }
  
  await updateApplication(c.env.DB, appId, { status: body.status });
  
  return c.json<ApiResponse>({
    success: true,
    message: body.status === 'active' ? '应用已启用' : '应用已禁用'
  });
});

apps.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const appId = c.req.param('id') as string;
  
  const app = await findApplicationById(c.env.DB, appId);
  if (!app) {
    return c.json<ApiResponse>({ success: false, error: '应用不存在' }, 404);
  }
  
  await deleteApplication(c.env.DB, appId);
  return c.json<ApiResponse>({ success: true, message: '应用已删除' });
});

apps.post('/:id/auth-check', async (c) => {
  const appId = c.req.param('id') as string;
  const appKey = c.req.header('X-App-Key');
  const authHeader = c.req.header('Authorization');
  
  if (!appKey) {
    return c.json({ authorized: false, error: '缺少 X-App-Key 头' }, 400);
  }
  
  const app = await findApplicationByKey(c.env.DB, appKey);
  if (!app || app.id !== appId) {
    return c.json({ authorized: false, error: '无效的应用凭证' }, 401);
  }
  
  if (app.status !== 'active') {
    return c.json({ authorized: false, error: '应用已被禁用' }, 403);
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ authorized: false, error: '未提供认证令牌' }, 401);
  }
  
  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload) {
    return c.json({ authorized: false, error: '无效的认证令牌' }, 401);
  }
  
  const sessionValid = await checkSession(c.env.KV, payload.userId, token);
  if (!sessionValid) {
    return c.json({ authorized: false, error: '会话已过期' }, 401);
  }
  
  const user = await findUserById(c.env.DB, payload.userId);
  if (!user || user.status !== 'active') {
    return c.json({ authorized: false, error: '用户不存在或已被禁用' }, 401);
  }
  
  const { listUserClasses } = await import('../db');
  const classes = await listUserClasses(c.env.DB, user.id);
  
  return c.json({
    authorized: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      realName: user.realName,
      role: user.role,
      avatarUrl: user.avatarUrl
    },
    classes: classes.map(cls => ({
      id: cls.class.id,
      name: cls.class.name,
      code: cls.class.code,
      roleInClass: cls.roleInClass
    }))
  });
});

export default apps;
