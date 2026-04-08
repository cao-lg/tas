import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload, UserRole } from './shared/types';
import { JWT_EXPIRY_SECONDS } from './shared/constants';
import type { KVNamespace } from '@cloudflare/workers-types';

export async function signToken(
  payload: { userId: string; username: string; role: UserRole },
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  const token = await new SignJWT({
    userId: payload.userId,
    username: payload.username,
    role: payload.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
    .sign(secretKey);
  
  return token;
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as UserRole,
      iat: payload.iat as number,
      exp: payload.exp as number
    };
  } catch {
    return null;
  }
}

export async function storeSession(kv: KVNamespace, userId: string, token: string): Promise<void> {
  const tokenSuffix = token.slice(-16);
  const key = `session:${userId}:${tokenSuffix}`;
  await kv.put(key, JSON.stringify({ createdAt: Date.now() }), {
    expirationTtl: JWT_EXPIRY_SECONDS
  });
}

export async function checkSession(kv: KVNamespace, userId: string, token: string): Promise<boolean> {
  const tokenSuffix = token.slice(-16);
  const key = `session:${userId}:${tokenSuffix}`;
  const session = await kv.get(key);
  return session !== null;
}

export async function deleteSession(kv: KVNamespace, userId: string, token: string): Promise<void> {
  const tokenSuffix = token.slice(-16);
  const key = `session:${userId}:${tokenSuffix}`;
  await kv.delete(key);
}

export async function invalidateAllSessions(kv: KVNamespace, userId: string): Promise<void> {
  const list = await kv.list({ prefix: `session:${userId}:` });
  for (const key of list.keys) {
    await kv.delete(key.name);
  }
}
