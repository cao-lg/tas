import { useState, useEffect } from 'react';
import type { Application, AppStatus } from '@tas/shared';

interface AppDisplay extends Omit<Application, 'appSecret'> {
  appSecret?: string;
}

export default function Apps() {
  const [apps, setApps] = useState<AppDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppDisplay | null>(null);
  const [newAppSecret, setNewAppSecret] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    callbackUrl: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch('/api/apps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setApps(data.data || []);
      }
    } catch {
      setError('获取应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('应用名称不能为空');
      return;
    }

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setNewAppSecret(data.data.appSecret);
        setSuccess('应用创建成功！请保存 App Secret，此信息仅显示一次');
        setFormData({ name: '', description: '', callbackUrl: '' });
        setShowCreateModal(false);
        fetchApps();
      } else {
        setError(data.error || '创建失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleToggleStatus = async (app: AppDisplay) => {
    const newStatus: AppStatus = app.status === 'active' ? 'inactive' : 'active';
    
    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch(`/api/apps/${app.id}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        fetchApps();
      } else {
        setError(data.error || '操作失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleDeleteApp = async (app: AppDisplay) => {
    if (!confirm(`确定要删除应用 "${app.name}" 吗？此操作不可恢复！`)) return;

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch(`/api/apps/${app.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('应用已删除');
        setShowDetailModal(false);
        fetchApps();
      } else {
        setError(data.error || '删除失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`${label}已复制到剪贴板`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">应用管理</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          注册新应用
        </button>
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

      {newAppSecret && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg">
          <p className="font-medium text-yellow-800 mb-2">新应用的 App Secret：</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-yellow-100 px-3 py-2 rounded font-mono text-sm break-all">
              {newAppSecret}
            </code>
            <button
              onClick={() => copyToClipboard(newAppSecret, 'App Secret')}
              className="btn btn-secondary text-sm"
            >
              复制
            </button>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            ⚠️ 请立即保存此密钥，关闭后将无法再次查看
          </p>
        </div>
      )}

      {/* App List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : apps.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无应用</h3>
          <p className="text-gray-500 mb-4">注册第三方应用以接入 TAS 认证系统</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            注册第一个应用
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map(app => (
            <div key={app.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{app.name}</h3>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                    app.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {app.status === 'active' ? '已启用' : '已禁用'}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedApp(app); setShowDetailModal(true); }}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  查看详情
                </button>
              </div>

              {app.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {app.description}
                </p>
              )}

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  App Key: <code className="font-mono">{app.appKey}</code>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  创建于 {formatDate(app.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">注册新应用</h2>
            
            <form onSubmit={handleCreateApp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  应用名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="如：在线考试系统"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  回调 URL
                </label>
                <input
                  type="url"
                  value={formData.callbackUrl}
                  onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                  className="input"
                  placeholder="https://example.com/auth/callback"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="应用简介（可选）"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  注册
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedApp.name}</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">App Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded font-mono text-sm break-all">
                    {selectedApp.appKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedApp.appKey, 'App Key')}
                    className="btn btn-secondary text-sm"
                  >
                    复制
                  </button>
                </div>
              </div>

              {selectedApp.callbackUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">回调 URL</label>
                  <p className="text-gray-900 break-all">{selectedApp.callbackUrl}</p>
                </div>
              )}

              {selectedApp.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <p className="text-gray-900">{selectedApp.description}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                <button
                  onClick={() => handleToggleStatus(selectedApp)}
                  className={`btn ${selectedApp.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {selectedApp.status === 'active' ? '禁用应用' : '启用应用'}
                </button>
                <button
                  onClick={() => handleDeleteApp(selectedApp)}
                  className="btn btn-danger"
                >
                  删除应用
                </button>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
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
