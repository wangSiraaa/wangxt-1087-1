import { useState, useEffect, useCallback } from 'react';
import { api, UserType, RouteType, BookingType, StationType, LeaveRecordType, BoardingRecordType, CapacityInfo } from './api';
import AdminPage from './pages/AdminPage';
import EmployeePage from './pages/EmployeePage';
import DriverPage from './pages/DriverPage';

const TABS_BY_ROLE: Record<string, { key: string; label: string }[]> = {
  admin: [
    { key: 'routes', label: '线路管理' },
    { key: 'leaves', label: '请假管理' },
    { key: 'bookings', label: '预约总览' },
    { key: 'boarding', label: '上车记录' },
  ],
  employee: [
    { key: 'book', label: '预约乘车' },
    { key: 'my', label: '我的预约' },
  ],
  driver: [
    { key: 'route', label: '我的线路' },
    { key: 'board', label: '确认上车' },
    { key: 'history', label: '上车记录' },
  ],
};

function App() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    api.getUsers().then((list) => {
      setUsers(list);
      if (list.length > 0) {
        setCurrentUser(list[0]);
        const tabs = TABS_BY_ROLE[list[0].role];
        if (tabs.length > 0) setActiveTab(tabs[0].key);
      }
    }).catch(() => showToast('无法加载用户列表', 'error'));
  }, [showToast]);

  const handleUserChange = (userId: number) => {
    const u = users.find((x) => x.id === userId);
    if (u) {
      setCurrentUser(u);
      const tabs = TABS_BY_ROLE[u.role];
      setActiveTab(tabs.length > 0 ? tabs[0].key : '');
    }
  };

  if (!currentUser) {
    return <div className="loading">加载中...</div>;
  }

  const tabs = TABS_BY_ROLE[currentUser.role] || [];

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>🚌 企业班车预约系统</h1>
          <div className="user-info">
            <span>
              {currentUser.name}
              <span className={`badge badge-${currentUser.role}`} style={{ marginLeft: 6 }}>
                {currentUser.role === 'admin' ? '行政' : currentUser.role === 'driver' ? '司机' : '员工'}
              </span>
            </span>
            <select value={currentUser.id} onChange={(e) => handleUserChange(Number(e.target.value))}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'admin' ? '行政' : u.role === 'driver' ? '司机' : '员工'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <div className="container" style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t) => (
            <button key={t.key} className={activeTab === t.key ? 'active' : ''} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container page">
        {currentUser.role === 'admin' && (
          <AdminPage tab={activeTab} showToast={showToast} />
        )}
        {currentUser.role === 'employee' && (
          <EmployeePage tab={activeTab} currentUser={currentUser} showToast={showToast} />
        )}
        {currentUser.role === 'driver' && (
          <DriverPage tab={activeTab} currentUser={currentUser} showToast={showToast} />
        )}
      </main>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
