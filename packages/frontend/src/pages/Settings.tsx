import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [profileData, setProfileData] = useState({
    realName: user?.realName || '',
    avatarUrl: user?.avatarUrl || ''
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!profileData.realName.trim()) {
      setError('真实姓名不能为空');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('个人信息已更新');
        refreshUser();
      } else {
        setError(data.error || '更新失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordData.oldPassword || !passwordData.newPassword) {
      setError('请填写所有密码字段');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('新密码长度至少为6位');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('密码修改成功');
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(data.error || '修改失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (user?.avatarUrl) return user.avatarUrl;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.realName || 'U')}&backgroundColor=3b82f6`;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: '管理员',
      teacher: '教师',
      student: '学生'
    };
    return labels[role] || role;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">个人设置</h1>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={getAvatarUrl()}
            alt={user?.realName}
            className="w-20 h-20 rounded-full bg-gray-200"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.realName}</h2>
            <p className="text-gray-500">@{user?.username}</p>
            <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
              user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
              user?.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {getRoleLabel(user?.role || '')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">邮箱</p>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-500">注册时间</p>
            <p className="text-gray-900">{user?.createdAt ? formatDate(user.createdAt) : '-'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            个人信息
          </button>
          <button
            onClick={() => { setActiveTab('password'); setError(''); setSuccess(''); }}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            修改密码
          </button>
        </div>
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

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                真实姓名
              </label>
              <input
                type="text"
                value={profileData.realName}
                onChange={(e) => setProfileData({ ...profileData, realName: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                头像 URL
              </label>
              <input
                type="url"
                value={profileData.avatarUrl}
                onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                className="input"
                placeholder="https://example.com/avatar.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                支持外部图片链接，推荐使用{' '}
                <a href="https://dicebear.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  DiceBear
                </a>
                {' '}或{' '}
                <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  Gravatar
                </a>
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Form */}
      {activeTab === 'password' && (
        <div className="card p-6">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                当前密码
              </label>
              <input
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新密码
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="input"
                placeholder="至少6位字符"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认新密码
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? '修改中...' : '修改密码'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
