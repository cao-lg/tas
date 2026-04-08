import type { Context, Next } from 'hono';
import type { Env } from '../env';

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const origin = c.req.header('Origin') || '*';
  
  await next();
  
  c.res.headers.set('Access-Control-Allow-Origin', origin);
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-App-Key');
  c.res.headers.set('Access-Control-Max-Age', '86400');
}

export async function optionsHandler(_c: Context) {
  return new Response(null, { status: 204 });
}
