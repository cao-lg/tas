import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Class } from '@tas/shared';

interface ClassWithRole extends Class {
  roleInClass: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassWithRole[]>([]);
  const [stats, setStats] = useState({
    classCount: 0,
    studentCount: 0,
    appCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('tas_token');
      
      const classesRes = await fetch('/api/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const classesData = await classesRes.json();
      
      if (classesData.success) {
        setClasses(classesData.data || []);
      }

      if (user?.role === 'admin') {
        const usersRes = await fetch('/api/users?pageSize=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        
        const appsRes = await fetch('/api/apps', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const appsData = await appsRes.json();

        setStats({
          classCount: classes.length,
          studentCount: usersData.data?.total || 0,
          appCount: appsData.data?.length || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: '管理员',
      teacher: '教师',
      student: '学生'
    };
    return labels[role] || role;
  };

  const getAvatarUrl = () => {
    if (user?.avatarUrl) return user.avatarUrl;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.realName || 'U')}&backgroundColor=3b82f6`;
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
      {/* Welcome Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <img
            src={getAvatarUrl()}
            alt={user?.realName}
            className="w-16 h-16 rounded-full bg-gray-200"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              你好，{user?.realName}！
            </h1>
            <p className="text-gray-500 mt-1">
              {getRoleLabel(user?.role || '')} · {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards (Admin/Teacher only) */}
      {(user?.role === 'admin' || user?.role === 'teacher') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏫</span>
              </div>
              <div>
                <p className="text-gray-500 text-sm">班级总数</p>
                <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
              </div>
            </div>
          </div>

          {user?.role === 'admin' && (
            <>
              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">用户总数</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.studentCount}</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">应用总数</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.appCount}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/classes" className="btn btn-primary">
            查看班级
          </Link>
          {user?.role !== 'student' && (
            <Link to="/classes" className="btn btn-secondary">
              创建班级
            </Link>
          )}
          {user?.role === 'admin' && (
            <>
              <Link to="/users" className="btn btn-secondary">
                管理用户
              </Link>
              <Link to="/apps" className="btn btn-secondary">
                管理应用
              </Link>
            </>
          )}
        </div>
      </div>

      {/* My Classes */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">我的班级</h2>
          <Link to="/classes" className="text-primary-600 hover:underline text-sm">
            查看全部 →
          </Link>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无班级</p>
            {user?.role !== 'student' && (
              <Link to="/classes" className="text-primary-600 hover:underline mt-2 inline-block">
                创建第一个班级
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.slice(0, 6).map(cls => (
              <Link
                key={cls.id}
                to={`/classes/${cls.id}`}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">{cls.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {cls.academicYear || '未设置学年'}
                </p>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    cls.roleInClass === 'teacher' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {cls.roleInClass === 'teacher' ? '教师' : '学生'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
