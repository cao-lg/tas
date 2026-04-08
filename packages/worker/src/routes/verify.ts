import { Hono } from 'hono';
import type { Env } from '../env';
import { verifyToken, checkSession } from '../utils/jwt';
import { findUserById, listUserClasses } from '../db';

const verify = new Hono<{ Bindings: Env }>();

verify.post('/', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ valid: false, error: '未提供认证令牌' }, 401);
  }
  
  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload) {
    return c.json({ valid: false, error: '无效的认证令牌' }, 401);
  }
  
  const sessionValid = await checkSession(c.env.KV, payload.userId, token);
  if (!sessionValid) {
    return c.json({ valid: false, error: '会话已过期' }, 401);
  }
  
  const user = await findUserById(c.env.DB, payload.userId);
  if (!user) {
    return c.json({ valid: false, error: '用户不存在' }, 401);
  }
  
  if (user.status !== 'active') {
    return c.json({ valid: false, error: '账户已被禁用' }, 403);
  }
  
  const classes = await listUserClasses(c.env.DB, user.id);
  
  return c.json({
    valid: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      realName: user.realName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      status: user.status
    },
    classes: classes.map(c => ({
      id: c.class.id,
      name: c.class.name,
      roleInClass: c.roleInClass
    }))
  });
});

export default verify;
