export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'inactive' | 'banned';
export type ClassMemberRole = 'teacher' | 'student' | 'assistant';
export type AppStatus = 'active' | 'inactive';

export interface User {
  id: string;
  username: string;
  email: string;
  realName: string;
  role: UserRole;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Class {
  id: string;
  name: string;
  code: string;
  description: string | null;
  academicYear: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ClassMember {
  id: string;
  classId: string;
  userId: string;
  roleInClass: ClassMemberRole;
  joinedAt: number;
  user?: User;
}

export interface Application {
  id: string;
  name: string;
  appKey: string;
  appSecret: string;
  callbackUrl: string | null;
  description: string | null;
  ownerId: string;
  status: AppStatus;
  createdAt: number;
}

export interface AppAuthorization {
  id: string;
  appId: string;
  userId: string;
  permissions: string[] | null;
  authorizedAt: number;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface UserWithClasses extends User {
  classes: Array<{
    id: string;
    name: string;
    roleInClass: ClassMemberRole;
  }>;
}
