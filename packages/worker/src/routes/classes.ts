import { Hono } from 'hono';
import type { Env } from '../env';
import {
  findClassById,
  findClassByCode,
  createClass,
  updateClass,
  deleteClass,
  findClassMember,
  addClassMember,
  removeClassMember,
  listClassMembers,
  listUserClasses,
  findUserByEmail,
  findUserByUsername,
  createUser
} from '../db';
import { authMiddleware, getAuthUser, requireRole } from '../middleware/auth';
import { generateId, generateClassCode, CLASS_CODE_LENGTH, type ApiResponse, type CreateClassRequest, type UpdateClassRequest, type AddClassMemberRequest, type BatchImportStudentRequest, type BatchImportStudentResult } from '@tas/shared';
import { hashPassword } from '../utils/password';
import { isValidEmail, isValidUsername, isValidPassword } from '@tas/shared';

const classes = new Hono<{ Bindings: Env }>();

classes.get('/', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const result = await listUserClasses(c.env.DB, authUser.userId);
  
  return c.json<ApiResponse>({
    success: true,
    data: result.map(r => ({
      id: r.class.id,
      name: r.class.name,
      code: r.class.code,
      description: r.class.description,
      academicYear: r.class.academicYear,
      roleInClass: r.roleInClass,
      createdAt: r.class.createdAt
    }))
  });
});

classes.post('/', authMiddleware, requireRole('teacher', 'admin'), async (c) => {
  const authUser = getAuthUser(c)!;
  const body = await c.req.json<CreateClassRequest>();
  
  if (!body.name?.trim()) {
    return c.json<ApiResponse>({ success: false, error: '班级名称不能为空' }, 400);
  }
  
  let code = body.code?.toUpperCase() || generateClassCode(CLASS_CODE_LENGTH);
  
  let attempts = 0;
  while (await findClassByCode(c.env.DB, code)) {
    if (attempts >= 10) {
      return c.json<ApiResponse>({ success: false, error: '无法生成唯一班级代码，请稍后重试' }, 500);
    }
    code = generateClassCode(CLASS_CODE_LENGTH);
    attempts++;
  }
  
  const classData = await createClass(c.env.DB, {
    id: generateId(),
    name: body.name.trim(),
    code,
    description: body.description?.trim() || null,
    academicYear: body.academicYear?.trim() || null,
    createdBy: authUser.userId
  });
  
  await addClassMember(c.env.DB, {
    classId: classData.id,
    userId: authUser.userId,
    roleInClass: 'teacher'
  });
  
  return c.json<ApiResponse>({ success: true, data: classData });
});

classes.get('/:id', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const classId = c.req.param('id') as string;
  
  const classData = await findClassById(c.env.DB, classId);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级不存在' }, 404);
  }
  
  const membership = await findClassMember(c.env.DB, classId, authUser.userId);
  const isAdmin = authUser.role === 'admin';
  
  if (!membership && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '您不是该班级成员' }, 403);
  }
  
  const members = await listClassMembers(c.env.DB, classId);
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      ...classData,
      members: members.map(m => ({
        id: m.userId,
        username: m.user.username,
        realName: m.user.realName,
        roleInClass: m.roleInClass,
        joinedAt: m.joinedAt,
        avatarUrl: membership?.roleInClass === 'teacher' || isAdmin ? m.user.avatarUrl : undefined
      })),
      isTeacher: membership?.roleInClass === 'teacher' || isAdmin,
      canManage: membership?.roleInClass === 'teacher' || isAdmin
    }
  });
});

classes.put('/:id', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const classId = c.req.param('id') as string;
  const body = await c.req.json<UpdateClassRequest>();
  
  const classData = await findClassById(c.env.DB, classId);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级不存在' }, 404);
  }
  
  const membership = await findClassMember(c.env.DB, classId, authUser.userId);
  const isAdmin = authUser.role === 'admin';
  
  if (!membership && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '权限不足' }, 403);
  }
  
  if (membership?.roleInClass !== 'teacher' && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '只有教师或管理员可以编辑班级' }, 403);
  }
  
  const updates: { name?: string; description?: string | null; academicYear?: string | null } = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description.trim() || null;
  if (body.academicYear !== undefined) updates.academicYear = body.academicYear.trim() || null;
  
  await updateClass(c.env.DB, classId, updates);
  
  const updated = await findClassById(c.env.DB, classId);
  return c.json<ApiResponse>({ success: true, data: updated });
});

classes.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const classId = c.req.param('id') as string;
  
  const classData = await findClassById(c.env.DB, classId);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级不存在' }, 404);
  }
  
  await deleteClass(c.env.DB, classId);
  return c.json<ApiResponse>({ success: true, message: '班级已删除' });
});

classes.post('/:id/join', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const classId = c.req.param('id') as string;
  const body = await c.req.json<{ code?: string }>();
  
  let code = body.code;
  if (!code) {
    const classData = await findClassById(c.env.DB, classId);
    if (!classData) {
      return c.json<ApiResponse>({ success: false, error: '班级不存在' }, 404);
    }
    code = classData.code;
  }
  
  const classData = await findClassByCode(c.env.DB, code);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级代码无效' }, 404);
  }
  
  const existing = await findClassMember(c.env.DB, classData.id, authUser.userId);
  if (existing) {
    return c.json<ApiResponse>({ success: false, error: '您已经是该班级成员' }, 400);
  }
  
  await addClassMember(c.env.DB, {
    classId: classData.id,
    userId: authUser.userId,
    roleInClass: 'student'
  });
  
  return c.json<ApiResponse>({
    success: true,
    data: { classId: classData.id, className: classData.name },
    message: '成功加入班级'
  });
});

classes.post('/code/:code/join', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const code = c.req.param('code') as string;
  
  const classData = await findClassByCode(c.env.DB, code);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级代码无效' }, 404);
  }
  
  const existing = await findClassMember(c.env.DB, classData.id, authUser.userId);
  if (existing) {
    return c.json<ApiResponse>({ success: false, error: '您已经是该班级成员' }, 400);
  }
  
  await addClassMember(c.env.DB, {
    classId: classData.id,
    userId: authUser.userId,
    roleInClass: 'student'
  });
  
  return c.json<ApiResponse>({
    success: true,
    data: { classId: classData.id, className: classData.name },
    message: '成功加入班级'
  });
});

classes.get('/:id/members', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const classId = c.req.param('id') as string;
  
  const classData = await findClassById(c.env.DB, classId);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级不存在' }, 404);
  }
  
  const membership = await findClassMember(c.env.DB, classId, authUser.userId);
  const isAdmin = authUser.role === 'admin';
  
  if (!membership && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '您不是该班级成员' }, 403);
  }
  
  const members = await listClassMembers(c.env.DB, classId);
  const isTeacher = membership?.roleInClass === 'teacher' || isAdmin;
  
  return c.json<ApiResponse>({
    success: true,
    data: members.map(m => ({
      id: m.userId,
      username: m.user.username,
      realName: m.user.realName,
      roleInClass: m.roleInClass,
      joinedAt: m.joinedAt,
      avatarUrl: isTeacher ? m.user.avatarUrl : undefined,
      email: isTeacher ? m.user.email : undefined
    }))
  });
});

classes.post('/:id/members', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const classId = c.req.param('id') as string;
  const body = await c.req.json<AddClassMemberRequest>();
  
  const classData = await findClassById(c.env.DB, classId);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级不存在' }, 404);
  }
  
  const membership = await findClassMember(c.env.DB, classId, authUser.userId);
  const isAdmin = authUser.role === 'admin';
  
  if (!membership && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '权限不足' }, 403);
  }
  
  if (membership?.roleInClass !== 'teacher' && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '只有教师或管理员可以添加成员' }, 403);
  }
  
  let targetUser = await findUserByEmail(c.env.DB, body.userIdentifier);
  if (!targetUser) {
    targetUser = await findUserByUsername(c.env.DB, body.userIdentifier);
  }
  
  if (!targetUser) {
    return c.json<ApiResponse>({ success: false, error: '找不到该用户' }, 404);
  }
  
  if (targetUser.status !== 'active') {
    return c.json<ApiResponse>({ success: false, error: '该用户账户已被禁用' }, 400);
  }
  
  const existing = await findClassMember(c.env.DB, classId, targetUser.id);
  if (existing) {
    return c.json<ApiResponse>({ success: false, error: '该用户已是班级成员' }, 400);
  }
  
  const newMember = await addClassMember(c.env.DB, {
    classId,
    userId: targetUser.id,
    roleInClass: body.roleInClass || 'student'
  });
  
  return c.json<ApiResponse>({
    success: true,
    data: {
      userId: targetUser.id,
      username: targetUser.username,
      realName: targetUser.realName,
      roleInClass: newMember.roleInClass,
      joinedAt: newMember.joinedAt
    },
    message: '成员添加成功'
  });
});

classes.delete('/:id/members/:userId', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const classId = c.req.param('id') as string;
  const targetUserId = c.req.param('userId') as string;
  
  const classData = await findClassById(c.env.DB, classId);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级不存在' }, 404);
  }
  
  const membership = await findClassMember(c.env.DB, classId, authUser.userId);
  const isAdmin = authUser.role === 'admin';
  
  if (!membership && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '权限不足' }, 403);
  }
  
  if (membership?.roleInClass !== 'teacher' && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '只有教师或管理员可以移除成员' }, 403);
  }
  
  const targetMember = await findClassMember(c.env.DB, classId, targetUserId);
  if (!targetMember) {
    return c.json<ApiResponse>({ success: false, error: '该用户不是班级成员' }, 404);
  }
  
  if (targetMember.roleInClass === 'teacher' && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '不能移除教师，请联系管理员' }, 403);
  }
  
  await removeClassMember(c.env.DB, classId, targetUserId);
  return c.json<ApiResponse>({ success: true, message: '成员已移除' });
});

classes.post('/:id/batch-import', authMiddleware, async (c) => {
  const authUser = getAuthUser(c)!;
  const classId = c.req.param('id') as string;
  const body = await c.req.json<BatchImportStudentRequest>();
  
  const classData = await findClassById(c.env.DB, classId);
  if (!classData) {
    return c.json<ApiResponse>({ success: false, error: '班级不存在' }, 404);
  }
  
  const membership = await findClassMember(c.env.DB, classId, authUser.userId);
  const isAdmin = authUser.role === 'admin';
  
  if (!membership && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '权限不足' }, 403);
  }
  
  if (membership?.roleInClass !== 'teacher' && !isAdmin) {
    return c.json<ApiResponse>({ success: false, error: '只有教师或管理员可以批量导入学生' }, 403);
  }
  
  const students = body.students || [];
  if (!Array.isArray(students) || students.length === 0) {
    return c.json<ApiResponse>({ success: false, error: '请提供学生列表' }, 400);
  }
  
  const result: BatchImportStudentResult = {
    total: students.length,
    success: 0,
    failed: 0,
    errors: [],
    importedStudents: []
  };
  
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    try {
      if (!student.username?.trim() || !student.email?.trim() || !student.realName?.trim()) {
        result.errors.push({
          index: i,
          username: student.username || '',
          email: student.email || '',
          error: '用户名、邮箱和真实姓名不能为空'
        });
        result.failed++;
        continue;
      }
      
      if (!isValidUsername(student.username.trim())) {
        result.errors.push({
          index: i,
          username: student.username,
          email: student.email,
          error: '用户名需为3-20位字母、数字或下划线'
        });
        result.failed++;
        continue;
      }
      
      if (!isValidEmail(student.email.trim())) {
        result.errors.push({
          index: i,
          username: student.username,
          email: student.email,
          error: '邮箱格式不正确'
        });
        result.failed++;
        continue;
      }
      
      const existingEmail = await findUserByEmail(c.env.DB, student.email.trim());
      const existingUsername = await findUserByUsername(c.env.DB, student.username.trim());
      
      let targetUser;
      
      if (existingEmail || existingUsername) {
        targetUser = existingEmail || existingUsername;
        
        const existingMember = await findClassMember(c.env.DB, classId, targetUser!.id);
        if (existingMember) {
          result.errors.push({
            index: i,
            username: student.username,
            email: student.email,
            error: '该用户已是班级成员'
          });
          result.failed++;
          continue;
        }
      } else {
        const password = student.password?.trim() || '123456';
        if (!isValidPassword(password)) {
          result.errors.push({
            index: i,
            username: student.username,
            email: student.email,
            error: '密码长度需为6-100位'
          });
          result.failed++;
          continue;
        }
        
        const passwordHash = await hashPassword(password);
        
        targetUser = await createUser(c.env.DB, {
          id: generateId(),
          username: student.username.trim(),
          email: student.email.trim(),
          passwordHash,
          realName: student.realName.trim(),
          role: 'student',
          avatarUrl: null,
          status: 'active'
        });
      }
      
      await addClassMember(c.env.DB, {
        classId,
        userId: targetUser.id,
        roleInClass: 'student'
      });
      
      result.success++;
      result.importedStudents.push({
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        realName: targetUser.realName
      });
      
    } catch (error) {
      result.errors.push({
        index: i,
        username: student.username || '',
        email: student.email || '',
        error: '导入失败，请稍后重试'
      });
      result.failed++;
    }
  }
  
  return c.json<ApiResponse<BatchImportStudentResult>>({
    success: true,
    data: result,
    message: `批量导入完成：成功 ${result.success} 人，失败 ${result.failed} 人`
  });
});

export default classes;
