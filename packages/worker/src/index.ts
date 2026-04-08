import { Hono } from 'hono';
import type { Env } from './env';
import { corsMiddleware, optionsHandler } from './middleware/cors';
import authRoutes from './routes/auth';
import verifyRoutes from './routes/verify';
import userRoutes from './routes/users';
import classRoutes from './routes/classes';
import appRoutes from './routes/apps';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);
app.options('*', optionsHandler);

app.get('/', (c) => {
  return c.json({
    name: 'Teaching Auth System (TAS)',
    version: '1.0.0',
    description: '教学管理通用用户管理系统 API'
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/api/auth', authRoutes);
app.route('/api/verify', verifyRoutes);
app.route('/api/users', userRoutes);
app.route('/api/classes', classRoutes);
app.route('/api/apps', appRoutes);

app.notFound((c) => {
  return c.json({ success: false, error: '接口不存在' }, 404);
});

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: '服务器内部错误' }, 500);
});

// 重点：Cloudflare Worker 标准导出格式
export default {
  fetch: app.fetch
};
