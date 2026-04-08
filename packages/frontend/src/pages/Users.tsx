import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { User, UserRole, UserStatus } from '@tas/shared';
import { apiFetch } from '../config/api';

interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('tas_token');
      const params = new URLSearchParams();
      params.append('page', String(page));
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);

      const response = await apiFetch(`/api/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        const paginated = data.data as PaginatedUsers;
        setUsers(paginated.items);
        setTotalPages(paginated.totalPages);
      }
    } catch {
      setError('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusAction = async (action: 'enable' | 'disable' | 'resetPassword') => {
    if (!selectedUser) return;
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('tas_token');
      const response = await apiFetch(`/api/users/${selectedUser.id}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (data.success) {
        if (action === 'resetPassword' && data.data?.newPassword) {
          setNewPassword(data.data.newPassword);
        } else {
          setSuccess(data.message || '操作成功');
          setShowStatusModal(false);
          fetchUsers();
        }
      } else {
        setError(data.error || '操作失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const getAvatarUrl = (user: User) => {
    if (user.avatarUrl) return user.avatarUrl;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.realName)}&backgroundColor=3b82f6`;
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      admin: '管理员',
      teacher: '教师',
      student: '学生'
    };
    return labels[role];
  };

  const getStatusLabel = (status: UserStatus) => {
    const labels: Record<UserStatus, string> = {
      active: '正常',
      inactive: '禁用',
      banned: '封禁'
    };
    return labels[status];
  };

  const getStatusColor = (status: UserStatus) => {
    const colors: Record<UserStatus, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      banned: 'bg-red-100 text-red-700'
    };
    return colors[status];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <select
              value={filters.role}
              onChange={(e) => { setFilters({ ...filters, role: e.target.value }); setPage(1); }}
              className="input w-32"
            >
              <option value="">全部</option>
              <option value="admin">管理员</option>
              <option value="teacher">教师</option>
              <option value="student">学生</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
              className="input w-32"
            >
              <option value="">全部</option>
              <option value="active">正常</option>
              <option value="inactive">禁用</option>
              <option value="banned">封禁</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            暂无用户数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(user)}
                          alt={user.realName}
                          className="w-10 h-10 rounded-full bg-gray-200"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{user.realName}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status)}`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => { setSelectedUser(user); setShowStatusModal(true); setNewPassword(''); }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          管理
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary text-sm"
            >
              上一页
            </button>
            <span className="text-sm text-gray-500">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary text-sm"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">管理用户</h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <img
                  src={getAvatarUrl(selectedUser)}
                  alt={selectedUser.realName}
                  className="w-12 h-12 rounded-full bg-gray-200"
                />
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.realName}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
            </div>

            {newPassword && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">新密码已生成：</p>
                <p className="font-mono text-lg font-bold text-yellow-900">{newPassword}</p>
                <p className="text-xs text-yellow-700 mt-2">请妥善保管此密码，关闭后将无法再次查看</p>
              </div>
            )}

            <div className="space-y-3">
              {selectedUser.status !== 'active' && (
                <button
                  onClick={() => handleStatusAction('enable')}
                  className="btn btn-primary w-full"
                >
                  启用账户
                </button>
              )}
              {selectedUser.status === 'active' && (
                <button
                  onClick={() => handleStatusAction('disable')}
                  className="btn btn-secondary w-full"
                >
                  禁用账户
                </button>
              )}
              <button
                onClick={() => handleStatusAction('resetPassword')}
                className="btn btn-secondary w-full"
              >
                重置密码
              </button>
              <button
                onClick={() => { setShowStatusModal(false); setNewPassword(''); }}
                className="btn btn-secondary w-full"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
