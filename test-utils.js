#!/usr/bin/env node

const { signToken, verifyToken } = require('./packages/worker/src/utils/jwt.ts');
const { hashPassword, verifyPassword } = require('./packages/worker/src/utils/password.ts');
const sharedUtils = require('./packages/shared/src/utils.ts');
const sharedConstants = require('./packages/shared/src/constants.ts');

console.log('============================================');
console.log('工具函数验证测试');
console.log('============================================\n');

let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passCount++;
  } catch (error) {
    console.log(`✗ FAIL: ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log('--- 测试 TR-7.1: JWT 签发和验证 ---');

test('signToken 能正确签发 token', async () => {
  const secret = 'test-secret-key-12345';
  const payload = {
    userId: 'user-123',
    username: 'testuser',
    role: 'student'
  };
  
  const token = await signToken(payload, secret);
  assert(typeof token === 'string' && token.length > 0, 'Token 应该是一个非空字符串');
  assert(token.includes('.'), 'Token 应该包含点分隔符');
});

test('verifyToken 能正确验证有效 token', async () => {
  const secret = 'test-secret-key-12345';
  const payload = {
    userId: 'user-123',
    username: 'testuser',
    role: 'student'
  };
  
  const token = await signToken(payload, secret);
  const verified = await verifyToken(token, secret);
  
  assert(verified !== null, '验证应该返回非空结果');
  assert(verified.userId === payload.userId, 'userId 应该匹配');
  assert(verified.username === payload.username, 'username 应该匹配');
  assert(verified.role === payload.role, 'role 应该匹配');
  assert(typeof verified.iat === 'number', 'iat 应该是一个数字');
  assert(typeof verified.exp === 'number', 'exp 应该是一个数字');
});

test('verifyToken 对无效 token 返回 null', async () => {
  const secret = 'test-secret-key-12345';
  const invalidToken = 'invalid.token.here';
  const verified = await verifyToken(invalidToken, secret);
  assert(verified === null, '无效 token 应该返回 null');
});

test('verifyToken 对错误密钥返回 null', async () => {
  const secret1 = 'test-secret-key-12345';
  const secret2 = 'wrong-secret-key-67890';
  const payload = {
    userId: 'user-123',
    username: 'testuser',
    role: 'student'
  };
  
  const token = await signToken(payload, secret1);
  const verified = await verifyToken(token, secret2);
  assert(verified === null, '错误密钥应该返回 null');
});

console.log('\n--- 测试 TR-7.2: 密码使用 bcrypt 加密验证 ---');

test('hashPassword 能正确加密密码', async () => {
  const password = 'TestPassword123!';
  const hash = await hashPassword(password);
  assert(typeof hash === 'string' && hash.length > 0, 'Hash 应该是一个非空字符串');
  assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash 应该是 bcrypt 格式');
});

test('verifyPassword 能正确验证密码', async () => {
  const password = 'TestPassword123!';
  const hash = await hashPassword(password);
  const isValid = await verifyPassword(password, hash);
  assert(isValid === true, '正确密码应该验证通过');
});

test('verifyPassword 对错误密码返回 false', async () => {
  const password = 'TestPassword123!';
  const wrongPassword = 'WrongPassword456!';
  const hash = await hashPassword(password);
  const isValid = await verifyPassword(wrongPassword, hash);
  assert(isValid === false, '错误密码应该验证失败');
});

console.log('\n--- 测试 TR-7.4: ID 生成和验证工具 ---');

test('generateId 返回有效的 UUID', () => {
  const id = sharedUtils.generateId();
  assert(typeof id === 'string', 'ID 应该是字符串');
  assert(id.length === 36, 'UUID 长度应该为 36');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  assert(uuidRegex.test(id), '应该是有效的 UUID 格式');
});

test('generateId 返回唯一 ID', () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    const id = sharedUtils.generateId();
    assert(!ids.has(id), 'ID 应该唯一');
    ids.add(id);
  }
});

test('generateClassCode 返回指定长度的代码', () => {
  const code = sharedUtils.generateClassCode();
  assert(typeof code === 'string', '班级代码应该是字符串');
  assert(code.length === 6, '默认长度应为 6');
  
  const customCode = sharedUtils.generateClassCode(8);
  assert(customCode.length === 8, '自定义长度应该正确');
});

test('generateClassCode 只包含允许的字符', () => {
  const code = sharedUtils.generateClassCode(100);
  const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (const char of code) {
    assert(allowedChars.includes(char), `字符 ${char} 应该在允许的字符集中`);
  }
});

test('isValidEmail 正确验证邮箱格式', () => {
  assert(sharedUtils.isValidEmail('test@example.com') === true, '有效邮箱应返回 true');
  assert(sharedUtils.isValidEmail('user.name+tag@domain.co.uk') === true, '带标签的邮箱应返回 true');
  assert(sharedUtils.isValidEmail('invalid') === false, '无效邮箱应返回 false');
  assert(sharedUtils.isValidEmail('@example.com') === false, '无用户名的邮箱应返回 false');
  assert(sharedUtils.isValidEmail('user@') === false, '无域名的邮箱应返回 false');
});

test('isValidUsername 正确验证用户名格式', () => {
  assert(sharedUtils.isValidUsername('user123') === true, '有效用户名应返回 true');
  assert(sharedUtils.isValidUsername('user_name') === true, '带下划线的用户名应返回 true');
  assert(sharedUtils.isValidUsername('ab') === false, '太短的用户名应返回 false');
  assert(sharedUtils.isValidUsername('a'.repeat(21)) === false, '太长的用户名应返回 false');
  assert(sharedUtils.isValidUsername('user name') === false, '带空格的用户名应返回 false');
  assert(sharedUtils.isValidUsername('user@name') === false, '带特殊字符的用户名应返回 false');
});

test('isValidPassword 正确验证密码长度', () => {
  assert(sharedUtils.isValidPassword('123456') === true, '6位密码应返回 true');
  assert(sharedUtils.isValidPassword('a'.repeat(100)) === true, '100位密码应返回 true');
  assert(sharedUtils.isValidPassword('12345') === false, '太短的密码应返回 false');
  assert(sharedUtils.isValidPassword('a'.repeat(101)) === false, '太长的密码应返回 false');
});

test('getTimestamp 返回当前 Unix 时间戳', () => {
  const timestamp = sharedUtils.getTimestamp();
  assert(typeof timestamp === 'number', '时间戳应该是数字');
  assert(Number.isInteger(timestamp), '时间戳应该是整数');
  const now = Math.floor(Date.now() / 1000);
  assert(Math.abs(timestamp - now) <= 1, '时间戳应该接近当前时间');
});

console.log('\n--- 测试共享常量 ---');

test('USER_ROLES 包含所有有效角色', () => {
  assert(Array.isArray(sharedConstants.USER_ROLES), 'USER_ROLES 应该是数组');
  assert(sharedConstants.USER_ROLES.includes('admin'), '应该包含 admin');
  assert(sharedConstants.USER_ROLES.includes('teacher'), '应该包含 teacher');
  assert(sharedConstants.USER_ROLES.includes('student'), '应该包含 student');
});

test('JWT_EXPIRY_SECONDS 计算正确', () => {
  assert(sharedConstants.JWT_EXPIRY_SECONDS === sharedConstants.JWT_EXPIRY_DAYS * 24 * 60 * 60, 'JWT 过期时间计算正确');
  assert(sharedConstants.JWT_EXPIRY_SECONDS === 7 * 24 * 60 * 60, '默认应该是 7 天');
});

test('BCRYPT_COST 设置正确', () => {
  assert(sharedConstants.BCRYPT_COST === 10, 'BCRYPT_COST 应该是 10');
});

console.log('\n--- 测试数据库操作工具函数完整性 (TR-7.3) ---');

const dbModule = require('./packages/worker/src/db/index.ts');
const requiredUserFunctions = [
  'findUserById', 'findUserByEmail', 'findUserByUsername', 
  'findUserByAccount', 'createUser', 'updateUser', 'listUsers'
];

const requiredClassFunctions = [
  'findClassById', 'findClassByCode', 'createClass', 
  'updateClass', 'deleteClass'
];

const requiredClassMemberFunctions = [
  'findClassMember', 'addClassMember', 'removeClassMember',
  'listClassMembers', 'listUserClasses'
];

const requiredAppFunctions = [
  'findApplicationById', 'findApplicationByKey', 
  'createApplication', 'updateApplication',
  'deleteApplication', 'listApplications'
];

const allRequiredFunctions = [
  ...requiredUserFunctions,
  ...requiredClassFunctions,
  ...requiredClassMemberFunctions,
  ...requiredAppFunctions
];

allRequiredFunctions.forEach(funcName => {
  test(`数据库函数 ${funcName} 存在`, () => {
    assert(typeof dbModule[funcName] === 'function', `${funcName} 应该是函数`);
  });
});

console.log('\n============================================');
console.log(`测试完成: ${passCount}/${testCount} 个通过`);
console.log('============================================');

process.exit(passCount === testCount ? 0 : 1);
