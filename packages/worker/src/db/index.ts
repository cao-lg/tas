import type { D1Database } from '@cloudflare/workers-types';
import type { User, Class, ClassMember, Application } from '@tas/shared';

export async function findUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return result ? mapUser(result) : null;
}

export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  return result ? mapUser(result) : null;
}

export async function findUserByUsername(db: D1Database, username: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username.toLowerCase()).first();
  return result ? mapUser(result) : null;
}

export async function findUserByAccount(db: D1Database, account: string): Promise<User | null> {
  const user = await findUserByEmail(db, account);
  if (user) return user;
  return findUserByUsername(db, account);
}

export async function createUser(db: D1Database, user: Omit<User, 'createdAt' | 'updatedAt'> & { passwordHash: string }): Promise<User> {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`
    INSERT INTO users (id, username, email, password_hash, real_name, role, avatar_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.id,
    user.username.toLowerCase(),
    user.email.toLowerCase(),
    user.passwordHash,
    user.realName,
    user.role,
    user.avatarUrl || null,
    user.status || 'active',
    now,
    now
  ).run();
  
  return {
    id: user.id,
    username: user.username.toLowerCase(),
    email: user.email.toLowerCase(),
    realName: user.realName,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
    status: user.status || 'active',
    createdAt: now,
    updatedAt: now
  };
}

export interface UserUpdates {
  realName?: string;
  avatarUrl?: string | null;
  status?: 'active' | 'inactive' | 'banned';
  passwordHash?: string;
}

export async function updateUser(db: D1Database, id: string, updates: UserUpdates): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  
  if (updates.realName !== undefined) {
    setClauses.push('real_name = ?');
    values.push(updates.realName);
  }
  if (updates.avatarUrl !== undefined) {
    setClauses.push('avatar_url = ?');
    values.push(updates.avatarUrl);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.passwordHash !== undefined) {
    setClauses.push('password_hash = ?');
    values.push(updates.passwordHash);
  }
  
  if (setClauses.length === 0) return;
  
  setClauses.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000));
  values.push(id);
  
  await db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function listUsers(db: D1Database, options: {
  page: number;
  pageSize: number;
  role?: string;
  status?: string;
  classId?: string;
}): Promise<{ users: User[]; total: number }> {
  let whereClauses: string[] = [];
  let params: unknown[] = [];
  
  if (options.role) {
    whereClauses.push('role = ?');
    params.push(options.role);
  }
  if (options.status) {
    whereClauses.push('status = ?');
    params.push(options.status);
  }
  if (options.classId) {
    whereClauses.push('id IN (SELECT user_id FROM class_members WHERE class_id = ?)');
    params.push(options.classId);
  }
  
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const countResult = await db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).bind(...params).first();
  const total = (countResult?.count as number) || 0;
  
  const offset = (options.page - 1) * options.pageSize;
  const results = await db.prepare(`SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, options.pageSize, offset).all();
  
  return {
    users: results.results.map(mapUser),
    total
  };
}

export async function findClassByCode(db: D1Database, code: string): Promise<Class | null> {
  const result = await db.prepare('SELECT * FROM classes WHERE code = ?').bind(code.toUpperCase()).first();
  return result ? mapClass(result) : null;
}

export async function findClassById(db: D1Database, id: string): Promise<Class | null> {
  const result = await db.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  return result ? mapClass(result) : null;
}

export async function createClass(db: D1Database, classData: Omit<Class, 'createdAt' | 'updatedAt'>): Promise<Class> {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`
    INSERT INTO classes (id, name, code, description, academic_year, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    classData.id,
    classData.name,
    classData.code.toUpperCase(),
    classData.description || null,
    classData.academicYear || null,
    classData.createdBy,
    now,
    now
  ).run();
  
  return {
    ...classData,
    code: classData.code.toUpperCase(),
    createdAt: now,
    updatedAt: now
  };
}

export interface ClassUpdates {
  name?: string;
  description?: string | null;
  academicYear?: string | null;
}

export async function updateClass(db: D1Database, id: string, updates: ClassUpdates): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  
  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    values.push(updates.description);
  }
  if (updates.academicYear !== undefined) {
    setClauses.push('academic_year = ?');
    values.push(updates.academicYear);
  }
  
  if (setClauses.length === 0) return;
  
  setClauses.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000));
  values.push(id);
  
  await db.prepare(`UPDATE classes SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deleteClass(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();
}

export async function findClassMember(db: D1Database, classId: string, userId: string): Promise<ClassMember | null> {
  const result = await db.prepare('SELECT * FROM class_members WHERE class_id = ? AND user_id = ?').bind(classId, userId).first();
  return result ? mapClassMember(result) : null;
}

export async function addClassMember(db: D1Database, member: Omit<ClassMember, 'id' | 'joinedAt'>): Promise<ClassMember> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db.prepare(`
    INSERT INTO class_members (id, class_id, user_id, role_in_class, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, member.classId, member.userId, member.roleInClass, now).run();
  
  return {
    id,
    classId: member.classId,
    userId: member.userId,
    roleInClass: member.roleInClass,
    joinedAt: now
  };
}

export async function removeClassMember(db: D1Database, classId: string, userId: string): Promise<void> {
  await db.prepare('DELETE FROM class_members WHERE class_id = ? AND user_id = ?').bind(classId, userId).run();
}

export async function listClassMembers(db: D1Database, classId: string): Promise<Array<ClassMember & { user: User }>> {
  const results = await db.prepare(`
    SELECT cm.*, u.id as user_id_col, u.username, u.email, u.real_name, u.role, u.avatar_url, u.status, u.created_at as user_created_at, u.updated_at as user_updated_at
    FROM class_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.class_id = ?
    ORDER BY cm.joined_at ASC
  `).bind(classId).all();
  
  return results.results.map(row => ({
    id: row.id as string,
    classId: row.class_id as string,
    userId: row.user_id as string,
    roleInClass: row.role_in_class as 'teacher' | 'student' | 'assistant',
    joinedAt: row.joined_at as number,
    user: {
      id: row.user_id_col as string,
      username: row.username as string,
      email: row.email as string,
      realName: row.real_name as string,
      role: row.role as 'admin' | 'teacher' | 'student',
      avatarUrl: row.avatar_url as string | null,
      status: row.status as 'active' | 'inactive' | 'banned',
      createdAt: row.user_created_at as number,
      updatedAt: row.user_updated_at as number
    }
  }));
}

export async function listUserClasses(db: D1Database, userId: string): Promise<Array<{ class: Class; roleInClass: string }>> {
  const results = await db.prepare(`
    SELECT c.*, cm.role_in_class
    FROM classes c
    JOIN class_members cm ON c.id = cm.class_id
    WHERE cm.user_id = ?
    ORDER BY c.created_at DESC
  `).bind(userId).all();
  
  return results.results.map(row => ({
    class: mapClass(row),
    roleInClass: row.role_in_class as string
  }));
}

export async function findApplicationById(db: D1Database, id: string): Promise<Application | null> {
  const result = await db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
  return result ? mapApplication(result) : null;
}

export async function findApplicationByKey(db: D1Database, appKey: string): Promise<Application | null> {
  const result = await db.prepare('SELECT * FROM applications WHERE app_key = ?').bind(appKey).first();
  return result ? mapApplication(result) : null;
}

export async function createApplication(db: D1Database, app: Omit<Application, 'createdAt'>): Promise<Application> {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`
    INSERT INTO applications (id, name, app_key, app_secret, callback_url, description, owner_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    app.id,
    app.name,
    app.appKey,
    app.appSecret,
    app.callbackUrl || null,
    app.description || null,
    app.ownerId,
    app.status || 'active',
    now
  ).run();
  
  return {
    ...app,
    createdAt: now
  };
}

export interface AppUpdates {
  name?: string;
  description?: string | null;
  callbackUrl?: string | null;
  status?: 'active' | 'inactive';
}

export async function updateApplication(db: D1Database, id: string, updates: AppUpdates): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  
  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    values.push(updates.description);
  }
  if (updates.callbackUrl !== undefined) {
    setClauses.push('callback_url = ?');
    values.push(updates.callbackUrl);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  
  if (setClauses.length === 0) return;
  
  values.push(id);
  
  await db.prepare(`UPDATE applications SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deleteApplication(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM applications WHERE id = ?').bind(id).run();
}

export async function listApplications(db: D1Database): Promise<Application[]> {
  const results = await db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
  return results.results.map(mapApplication);
}

function mapUser(row: unknown): User {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    username: r.username as string,
    email: r.email as string,
    realName: r.real_name as string,
    role: r.role as 'admin' | 'teacher' | 'student',
    avatarUrl: r.avatar_url as string | null,
    status: r.status as 'active' | 'inactive' | 'banned',
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number
  };
}

function mapClass(row: unknown): Class {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    code: r.code as string,
    description: r.description as string | null,
    academicYear: r.academic_year as string | null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number
  };
}

function mapClassMember(row: unknown): ClassMember {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    classId: r.class_id as string,
    userId: r.user_id as string,
    roleInClass: r.role_in_class as 'teacher' | 'student' | 'assistant',
    joinedAt: r.joined_at as number
  };
}

function mapApplication(row: unknown): Application {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    appKey: r.app_key as string,
    appSecret: r.app_secret as string,
    callbackUrl: r.callback_url as string | null,
    description: r.description as string | null,
    ownerId: r.owner_id as string,
    status: r.status as 'active' | 'inactive',
    createdAt: r.created_at as number
  };
}
