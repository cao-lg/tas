import { Hono } from 'hono';

const app = new Hono();

// 健康检查端点
app.get('/', (c) => {
  return c.text('✅ TAS Worker is running!');
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Worker is healthy'
  });
});

// 测试端点
app.get('/test', (c) => {
  return c.json({
    success: true,
    data: {
      name: 'Teaching Auth System (TAS)',
      version: '1.0.0',
      status: 'running'
    }
  });
});

// 404 处理
app.notFound((c) => {
  return c.json({ success: false, error: 'Endpoint not found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

// 导出 Hono 应用
export default app;
