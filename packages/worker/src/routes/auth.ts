import { Hono } from 'hono';
import type { Env } from '../env';
import { findUserByAccount, findUserByEmail, findUserByUsername, createUser } from '../db';
import { signToken, storeSession, deleteSession } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { isValidEmail, isValidUsername, isValidPassword, generateId } from '@tas/shared';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import type { RegisterRequest, LoginRequest, ApiResponse, LoginResponse } from '@tas/shared';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/register', async (c) => {
  const body = await c.req.json<RegisterRequest>();
  
  if (!body.username || !body.email || !body.realName || !body.password) {
    return c.json<ApiResponse>({ success: false, error: '请填写所有必填字段' }, 400);
  }
  
  if (!isValidUsername(body.username)) {
    return c.json<ApiResponse>({ success: false, error: '用户名需为3-20位字母、数字或下划线' }, 400);
  }
  
  if (!isValidEmail(body.email)) {
    return c.json<ApiResponse>({ success: false, error: '邮箱格式不正确' }, 400);
  }
  
  if (!isValidPassword(body.password)) {
    return c.json<ApiResponse>({ success: false, error: '密码长度需为6-100位' }, 400);
  }
  
  const existingEmail = await findUserByEmail(c.env.DB, body.email);
  if (existingEmail) {
    return c.json<ApiResponse>({ success: false, error: '该邮箱已被注册' }, 400);
  }
  
  const existingUsername = await findUserByUsername(c.env.DB, body.username);
  if (existingUsername) {
    return c.json<ApiResponse>({ success: false, error: '该用户名已被使用' }, 400);
  }
  
  // 检查是否为管理员注册
  if (body.role === 'admin') {
    // 检查系统中是否已有管理员
    const adminCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').bind('admin').first();
    const hasAdmin = (adminCount?.count as number) > 0;
    
    if (hasAdmin) {
      // 系统已有管理员，需要管理员权限
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json<ApiResponse>({ success: false, error: '注册管理员需要管理员权限' }, 403);
      }
      
      const token = authHeader.slice(7);
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      if (!payload || payload.role !== 'admin') {
        return c.json<ApiResponse>({ success: false, error: '只有管理员可以创建管理员账号' }, 403);
      }
    }
    // 如果系统中没有管理员，允许任何人创建第一个管理员
  }
  
  const passwordHash = await hashPassword(body.password);
  const role = body.role === 'teacher' || (body.role === 'admin' && body.role) ? body.role : 'student';
  
  const user = await createUser(c.env.DB, {
    id: generateId(),
    username: body.username,
    email: body.email,
    passwordHash,
    realName: body.realName,
    role,
    avatarUrl: null,
    status: 'active'
  });
  
  const token = await signToken(
    { userId: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET
  );
  
  await storeSession(c.env.KV, user.id, token);
  
  return c.json<ApiResponse<LoginResponse>>({
    success: true,
    data: { token, user }
  });
});

auth.post('/login', async (c) => {
  const body = await c.req.json<LoginRequest>();
  
  if (!body.account || !body.password) {
    return c.json<ApiResponse>({ success: false, error: '请输入账号和密码' }, 400);
  }
  
  const user = await findUserByAccount(c.env.DB, body.account);
  if (!user) {
    return c.json<ApiResponse>({ success: false, error: '账号或密码错误' }, 401);
  }
  
  const userWithHash = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();
  if (!userWithHash) {
    return c.json<ApiResponse>({ success: false, error: '账号或密码错误' }, 401);
  }
  
  const valid = await verifyPassword(body.password, userWithHash.password_hash as string);
  if (!valid) {
    return c.json<ApiResponse>({ success: false, error: '账号或密码错误' }, 401);
  }
  
  if (user.status !== 'active') {
    return c.json<ApiResponse>({ success: false, error: '账户已被禁用，请联系管理员' }, 403);
  }
  
  const token = await signToken(
    { userId: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET
  );
  
  await storeSession(c.env.KV, user.id, token);
  
  return c.json<ApiResponse<LoginResponse>>({
    success: true,
    data: { token, user }
  });
});

auth.post('/logout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.slice(7) || '';
  const user = getAuthUser(c);
  
  if (user) {
    await deleteSession(c.env.KV, user.userId, token);
  }
  
  return c.json<ApiResponse>({ success: true, message: '已成功登出' });
});

export default auth;
