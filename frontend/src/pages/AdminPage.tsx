import { useState, useEffect, useCallback } from 'react';
import { api, RouteType, StationType, BookingType, LeaveRecordType, BoardingRecordType, UserType } from '../api';

interface Props {
  tab: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function AdminPage({ tab, showToast }: Props) {
  return (
    <>
      {tab === 'routes' && <RouteManager showToast={showToast} />}
      {tab === 'leaves' && <LeaveManager showToast={showToast} />}
      {tab === 'bookings' && <BookingOverview showToast={showToast} />}
      {tab === 'boarding' && <BoardingHistory showToast={showToast} />}
    </>
  );
}

function RouteManager({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [drivers, setDrivers] = useState<UserType[]>([]);
  const [editing, setEditing] = useState<RouteType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', direction: 'up' as 'up' | 'down',
    departureTime: '07:30', returnTime: '18:00',
    vehiclePlate: '', driverId: 0,
    stations: [{ name: '', capacity: 20, arriveTime: '', address: '' }],
  });

  const load = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([api.getRoutes(), api.getUsers('driver')]);
      setRoutes(r);
      setDrivers(d);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '', description: '', direction: 'up',
      departureTime: '07:30', returnTime: '18:00',
      vehiclePlate: '', driverId: drivers[0]?.id || 0,
      stations: [{ name: '', capacity: 20, arriveTime: '', address: '' }],
    });
    setShowForm(true);
  };

  const openEdit = (route: RouteType) => {
    setEditing(route);
    setForm({
      name: route.name,
      description: route.description || '',
      direction: route.direction,
      departureTime: route.departureTime,
      returnTime: route.returnTime || '',
      vehiclePlate: route.vehiclePlate || '',
      driverId: route.driverId || 0,
      stations: (route.stations || []).map((s) => ({
        name: s.name, capacity: s.capacity,
        arriveTime: s.arriveTime || '', address: s.address || '',
      })),
    });
    setShowForm(true);
  };

  const save = async () => {
    try {
      if (!form.name || !form.departureTime) {
        showToast('请填写线路名称和发车时间', 'error');
        return;
      }
      if (editing) {
        await api.updateRoute(editing.id, form);
        showToast('线路已更新');
      } else {
        await api.createRoute(form);
        showToast('线路已创建');
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('确定停用该线路？')) return;
    try {
      await api.deleteRoute(id);
      showToast('线路已停用');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const addStation = () => {
    setForm({ ...form, stations: [...form.stations, { name: '', capacity: 20, arriveTime: '', address: '' }] });
  };

  const removeStation = (idx: number) => {
    setForm({ ...form, stations: form.stations.filter((_, i) => i !== idx) });
  };

  const updateStation = (idx: number, field: string, value: any) => {
    const stations = [...form.stations];
    stations[idx] = { ...stations[idx], [field]: value };
    setForm({ ...form, stations });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>线路管理</h2>
        <button className="btn btn-primary" onClick={openNew}>+ 新建线路</button>
      </div>

      {routes.map((route) => (
        <div key={route.id} className="route-card">
          <div className="route-header">
            <div>
              <span className="route-name">{route.name}</span>
              {route.direction === 'up' ? ' ↑ 上行' : ' ↓ 下行'}
              {!route.isActive && <span className="badge badge-cancelled" style={{ marginLeft: 8 }}>已停用</span>}
            </div>
            <div>
              <button className="btn btn-outline btn-sm" onClick={() => openEdit(route)}>编辑</button>
              {route.isActive && (
                <button className="btn btn-danger btn-sm" style={{ marginLeft: 8 }} onClick={() => remove(route.id)}>停用</button>
              )}
            </div>
          </div>
          <div className="route-meta">
            <span>🚐 {route.vehiclePlate || '未分配'}</span>
            <span>🕐 发车 {route.departureTime}</span>
            <span>🕐 返程 {route.returnTime || '-'}</span>
            <span>👤 司机: {route.driver?.name || '未分配'}</span>
          </div>
          <div className="station-list">
            {(route.stations || []).sort((a, b) => a.sequence - b.sequence).map((s) => (
              <span key={s.id} className="station-chip">
                <span className="seq">{s.sequence}</span>
                {s.name} (容量:{s.capacity})
              </span>
            ))}
          </div>
        </div>
      ))}

      {routes.length === 0 && <div className="empty-state"><div className="icon">🚍</div><p>暂无线路数据</p></div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? '编辑线路' : '新建线路'}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>线路名称 *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>方向</label>
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as any })}>
                  <option value="up">上行</option>
                  <option value="down">下行</option>
                </select>
              </div>
              <div className="form-group">
                <label>发车时间 *</label>
                <input value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label>返程时间</label>
                <input value={form.returnTime} onChange={(e) => setForm({ ...form, returnTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label>车牌号</label>
                <input value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>司机</label>
                <select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: Number(e.target.value) })}>
                  <option value={0}>未分配</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>描述</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <h3 style={{ marginTop: 16 }}>站点列表</h3>
            {form.stations.map((s, idx) => (
              <div key={idx} className="form-row" style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                <div className="form-group">
                  <label>站点名称 *</label>
                  <input value={s.name} onChange={(e) => updateStation(idx, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>容量 *</label>
                  <input type="number" value={s.capacity} onChange={(e) => updateStation(idx, 'capacity', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>到达时间</label>
                  <input value={s.arriveTime} onChange={(e) => updateStation(idx, 'arriveTime', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>地址</label>
                  <input value={s.address} onChange={(e) => updateStation(idx, 'address', e.target.value)} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-danger btn-sm" onClick={() => removeStation(idx)}>删除</button>
                </div>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={addStation}>+ 添加站点</button>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaveManager({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [records, setRecords] = useState<LeaveRecordType[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: 0, leaveDate: '', leaveType: '年假', reason: '' });

  const load = useCallback(async () => {
    try {
      const [r, e] = await Promise.all([api.getLeaves(), api.getUsers('employee')]);
      setRecords(r);
      setEmployees(e);
      if (e.length > 0 && form.userId === 0) setForm((f) => ({ ...f, userId: e[0].id }));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      if (!form.userId || !form.leaveDate) {
        showToast('请填写员工和日期', 'error');
        return;
      }
      await api.createLeave(form);
      showToast('请假记录已添加');
      setShowForm(false);
      setForm({ userId: form.userId, leaveDate: '', leaveType: '年假', reason: '' });
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>请假管理</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ 添加请假</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>员工</th>
              <th>工号</th>
              <th>请假日期</th>
              <th>类型</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.user?.name || '-'}</td>
                <td>{r.user?.employeeId || '-'}</td>
                <td>{r.leaveDate}</td>
                <td>{r.leaveType}</td>
                <td>{r.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <div className="empty-state"><p>暂无请假记录</p></div>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>添加请假记录</h2>
            <div className="form-row">
              <div className="form-group">
                <label>员工 *</label>
                <select value={form.userId} onChange={(e) => setForm({ ...form, userId: Number(e.target.value) })}>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>请假日期 *</label>
                <input type="date" value={form.leaveDate} onChange={(e) => setForm({ ...form, leaveDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>类型</label>
                <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                  <option>年假</option><option>事假</option><option>病假</option><option>调休</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>原因</label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingOverview({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<BookingType[]>([]);

  useEffect(() => { api.getRoutes().then(setRoutes).catch(() => {}); }, []);

  const loadBookings = useCallback(async () => {
    if (!selectedRoute || !travelDate) return;
    try {
      const b = await api.getRouteBookings(selectedRoute, travelDate);
      setBookings(b);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [selectedRoute, travelDate, showToast]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  useEffect(() => {
    if (routes.length > 0 && selectedRoute === 0) setSelectedRoute(routes[0].id);
  }, [routes, selectedRoute]);

  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const waitlisted = bookings.filter((b) => b.status === 'waitlist').length;
  const boarded = bookings.filter((b) => b.status === 'boarded').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

  return (
    <div>
      <h2>预约总览</h2>
      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>选择线路</label>
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(Number(e.target.value))}>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>乘车日期</label>
          <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="value" style={{ color: '#16a34a' }}>{confirmed}</div><div className="label">已确认</div></div>
        <div className="stat-card"><div className="value" style={{ color: '#d97706' }}>{waitlisted}</div><div className="label">候补中</div></div>
        <div className="stat-card"><div className="value" style={{ color: '#2563eb' }}>{boarded}</div><div className="label">已上车</div></div>
        <div className="stat-card"><div className="value" style={{ color: '#dc2626' }}>{cancelled}</div><div className="label">已取消</div></div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>员工</th><th>站点</th><th>状态</th><th>候补位</th><th>预约时间</th></tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.user?.name || '-'}</td>
                <td>{b.station?.name || '-'}</td>
                <td><span className={`badge badge-${b.status}`}>{statusLabel(b.status)}</span></td>
                <td>{b.waitlistPosition ?? '-'}</td>
                <td>{new Date(b.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <div className="empty-state"><p>暂无预约数据</p></div>}
      </div>
    </div>
  );
}

function BoardingHistory({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [records, setRecords] = useState<BoardingRecordType[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [filterRoute, setFilterRoute] = useState<number>(0);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => { api.getRoutes().then(setRoutes).catch(() => {}); }, []);

  const load = useCallback(async () => {
    try {
      const r = await api.getBoardingRecords(filterRoute || undefined, filterDate || undefined);
      setRecords(r);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [filterRoute, filterDate, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h2>上车记录</h2>
      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>线路</label>
          <select value={filterRoute} onChange={(e) => setFilterRoute(Number(e.target.value))}>
            <option value={0}>全部</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>日期</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>员工</th><th>线路</th><th>站点</th><th>乘车日期</th><th>上车时间</th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.user?.name || '-'}</td>
                <td>{r.route?.name || '-'}</td>
                <td>{r.station?.name || '-'}</td>
                <td>{r.travelDate}</td>
                <td>{new Date(r.boardedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <div className="empty-state"><p>暂无上车记录</p></div>}
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  const map: Record<string, string> = { confirmed: '已确认', waitlist: '候补', cancelled: '已取消', boarded: '已上车', no_show: '未到' };
  return map[s] || s;
}
