import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Class } from '@tas/shared';

interface ClassWithRole extends Class {
  roleInClass: string;
}

export default function Classes() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    academicYear: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch('/api/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('班级名称不能为空');
      return;
    }

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('班级创建成功！');
        setFormData({ name: '', description: '', academicYear: '' });
        setShowCreateModal(false);
        fetchClasses();
      } else {
        setError(data.error || '创建失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!joinCode.trim()) {
      setError('请输入班级代码');
      return;
    }

    try {
      const token = localStorage.getItem('tas_token');
      const response = await fetch(`/api/classes/${joinCode}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: joinCode })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`成功加入班级：${data.data.className}`);
        setJoinCode('');
        fetchClasses();
      } else {
        setError(data.error || '加入失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">班级管理</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            disabled={user?.role === 'student'}
          >
            创建班级
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

      {/* Join Class Form */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">加入班级</h2>
        <form onSubmit={handleJoinClass} className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="input flex-1"
            placeholder="输入6位班级代码"
            maxLength={8}
          />
          <button type="submit" className="btn btn-primary">
            加入
          </button>
        </form>
      </div>

      {/* Class List */}
      {classes.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">🏫</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无班级</h3>
          <p className="text-gray-500 mb-4">
            {user?.role === 'student' 
              ? '输入班级代码加入班级' 
              : '创建您的第一个班级开始管理'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <Link
              key={cls.id}
              to={`/classes/${cls.id}`}
              className="card p-6 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {cls.academicYear || '未设置学年'}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  cls.roleInClass === 'teacher' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {cls.roleInClass === 'teacher' ? '教师' : '学生'}
                </span>
              </div>
              
              {cls.description && (
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                  {cls.description}
                </p>
              )}
              
              {cls.roleInClass === 'teacher' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    班级代码：<span className="font-mono font-medium text-gray-900">{cls.code}</span>
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">创建班级</h2>
            
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班级名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="如：2024级计算机科学1班"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学年
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="input"
                  placeholder="如：2024-2025学年"
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
                  placeholder="班级简介（可选）"
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
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
