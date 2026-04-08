-- Migration 0001: Initial Schema
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    real_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 创建班级表
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    academic_year TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 创建班级成员关联表
CREATE TABLE IF NOT EXISTS class_members (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_class TEXT NOT NULL CHECK (role_in_class IN ('teacher', 'student', 'assistant')),
    joined_at INTEGER NOT NULL,
    UNIQUE(class_id, user_id)
);

-- 创建第三方应用表
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    app_key TEXT UNIQUE NOT NULL,
    app_secret TEXT NOT NULL,
    callback_url TEXT,
    description TEXT,
    owner_id TEXT NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at INTEGER NOT NULL
);

-- 创建应用授权表
CREATE TABLE IF NOT EXISTS app_authorizations (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions TEXT,
    authorized_at INTEGER NOT NULL,
    UNIQUE(app_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(code);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by);
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_app_key ON applications(app_key);
CREATE INDEX IF NOT EXISTS idx_applications_owner_id ON applications(owner_id);
CREATE INDEX IF NOT EXISTS idx_app_authorizations_app_id ON app_authorizations(app_id);
CREATE INDEX IF NOT EXISTS idx_app_authorizations_user_id ON app_authorizations(user_id);
