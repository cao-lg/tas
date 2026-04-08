export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoginResponse {
  token: string;
  user: import('./types').User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  realName: string;
  password: string;
  role?: import('./types').UserRole;
}

export interface LoginRequest {
  account: string;
  password: string;
}

export interface UpdateUserRequest {
  realName?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface CreateClassRequest {
  name: string;
  description?: string;
  academicYear?: string;
  code?: string;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  academicYear?: string;
}

export interface AddClassMemberRequest {
  userIdentifier: string;
  roleInClass: import('./types').ClassMemberRole;
}

export interface CreateAppRequest {
  name: string;
  description?: string;
  callbackUrl?: string;
}

export interface UpdateAppRequest {
  name?: string;
  description?: string;
  callbackUrl?: string;
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  role?: import('./types').UserRole;
  status?: import('./types').UserStatus;
  classId?: string;
}

export interface BatchImportStudentRequest {
  students: Array<{
    username: string;
    email: string;
    realName: string;
    password?: string;
  }>;
}

export interface BatchImportStudentResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    username: string;
    email: string;
    error: string;
  }>;
  importedStudents: Array<{
    id: string;
    username: string;
    email: string;
    realName: string;
  }>;
}
