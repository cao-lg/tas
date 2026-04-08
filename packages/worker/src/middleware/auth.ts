import type { Context, Next } from 'hono';
import type { Env } from '../env';
import { verifyToken, checkSession } from '../utils/jwt';
import type { JWTPayload } from '@tas/shared';

export interface AuthContext {
  user: JWTPayload;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未提供认证令牌' }, 401);
  }
  
  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload) {
    return c.json({ success: false, error: '无效的认证令牌' }, 401);
  }
  
  const sessionValid = await checkSession(c.env.KV, payload.userId, token);
  if (!sessionValid) {
    return c.json({ success: false, error: '会话已过期，请重新登录' }, 401);
  }
  
  c.set('auth', { user: payload });
  await next();
}

export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ success: false, error: '未认证' }, 401);
    }
    
    if (!roles.includes(auth.user.role)) {
      return c.json({ success: false, error: '权限不足' }, 403);
    }
    
    await next();
  };
}

export function getAuthUser(c: Context): JWTPayload | null {
  const auth = c.get('auth');
  return auth?.user || null;
}
