import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ClassDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  academicYear: string | null;
  members: Array<{
    id: string;
    username: string;
    realName: string;
    roleInClass: string;
    joinedAt: number;
    avatarUrl?: string;
    email?: string;
  }>;
  isTeacher: boolean;
  canManage: boolean;
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userIdentifier, setUserIdentifier] = useState('');
  const [memberRole, setMemberRole] = useState('student');
  const [editData, setEditData] = useState({ name: '', description: '', academicYear: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchClassDetail();
  }, [id]);

  const fetchClassDetail = async () => {
    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch(`/api/classes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setClassData(data.data);
        setEditData({
          name: data.data.name,
          description: data.data.description || '',
          academicYear: data.data.academicYear || ''
        });
      } else {
        setError(data.error || '获取班级信息失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userIdentifier.trim()) {
      setError('请输入用户名或邮箱');
      return;
    }

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch(`/api/classes/${id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIdentifier,
          roleInClass: memberRole
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('成员添加成功！');
        setUserIdentifier('');
        setShowAddModal(false);
        fetchClassDetail();
      } else {
        setError(data.error || '添加失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`确定要移除成员 ${memberName} 吗？`)) return;

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch(`/api/classes/${id}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('成员已移除');
        fetchClassDetail();
      } else {
        setError(data.error || '移除失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('班级信息已更新');
        setShowEditModal(false);
        fetchClassDetail();
      } else {
        setError(data.error || '更新失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleDeleteClass = async () => {
    if (!confirm('确定要删除此班级吗？此操作不可恢复！')) return;

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        navigate('/classes');
      } else {
        setError(data.error || '删除失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const copyInviteCode = () => {
    if (classData) {
      navigator.clipboard.writeText(classData.code);
      setSuccess('班级代码已复制到剪贴板');
    }
  };

  const getAvatarUrl = (name: string, avatarUrl?: string) => {
    if (avatarUrl) return avatarUrl;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=3b82f6`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">班级不存在或无权访问</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
          <p className="text-gray-500 mt-1">
            {classData.academicYear || '未设置学年'}
          </p>
        </div>
        {classData.canManage && (
          <div className="flex gap-3">
            <button onClick={() => setShowEditModal(true)} className="btn btn-secondary">
              编辑信息
            </button>
            {user?.role === 'admin' && (
              <button onClick={handleDeleteClass} className="btn btn-danger">
                删除班级
              </button>
            )}
          </div>
        )}
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

      {/* Class Info */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">班级代码</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold text-gray-900">{classData.code}</span>
              <button
                onClick={copyInviteCode}
                className="btn btn-secondary text-sm py-1"
              >
                复制
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              学生可使用此代码加入班级
            </p>
          </div>
          {classData.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">班级描述</h3>
              <p className="text-gray-900">{classData.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="card">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            成员列表 ({classData.members.length})
          </h2>
          {classData.canManage && (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              添加成员
            </button>
          )}
        </div>

        {classData.members.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            暂无成员
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {classData.members.map(member => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={getAvatarUrl(member.realName, member.avatarUrl)}
                    alt={member.realName}
                    className="w-10 h-10 rounded-full bg-gray-200"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{member.realName}</p>
                    <p className="text-sm text-gray-500">
                      @{member.username}
                      {classData.isTeacher && member.email && ` · ${member.email}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    member.roleInClass === 'teacher' 
                      ? 'bg-blue-100 text-blue-700' 
                      : member.roleInClass === 'assistant'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {member.roleInClass === 'teacher' ? '教师' : member.roleInClass === 'assistant' ? '助教' : '学生'}
                  </span>
                  <span className="text-sm text-gray-400">
                    {formatDate(member.joinedAt)}
                  </span>
                  {classData.canManage && member.roleInClass !== 'teacher' && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.realName)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">添加成员</h2>
            
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名或邮箱
                </label>
                <input
                  type="text"
                  value={userIdentifier}
                  onChange={(e) => setUserIdentifier(e.target.value)}
                  className="input"
                  placeholder="输入用户名或邮箱"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="input"
                >
                  <option value="student">学生</option>
                  <option value="assistant">助教</option>
                  <option value="teacher">教师</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">编辑班级信息</h2>
            
            <form onSubmit={handleEditClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班级名称
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学年
                </label>
                <input
                  type="text"
                  value={editData.academicYear}
                  onChange={(e) => setEditData({ ...editData, academicYear: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="input min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
