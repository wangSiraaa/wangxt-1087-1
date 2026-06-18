import { useState, useEffect, useCallback } from 'react';
import { api, RouteType, StationType, BookingType, LeaveRecordType, BoardingRecordType, UserType, ScheduleType, ExtraRouteInfoType, DayType, ExtraRouteType, OperationOverviewType, TimelineEventType } from '../api';

interface Props {
  tab: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function AdminPage({ tab, showToast }: Props) {
  return (
    <>
      {tab === 'routes' && <RouteManager showToast={showToast} />}
      {tab === 'schedules' && <ScheduleManager showToast={showToast} />}
      {tab === 'extra-routes' && <ExtraRouteManager showToast={showToast} />}
      {tab === 'leaves' && <LeaveManager showToast={showToast} />}
      {tab === 'bookings' && <BookingOverview showToast={showToast} />}
      {tab === 'overview' && <OperationOverview showToast={showToast} />}
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

  const driverName = (route: RouteType) => {
    if (route.driver?.name) return route.driver.name;
    if (route.driverId) {
      const rid = Number(route.driverId);
      const d = drivers.find((x) => Number(x.id) === rid);
      if (d) return d.name;
    }
    return '未分配';
  };

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
            <span>👤 司机: {driverName(route)}</span>
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
  const map: Record<string, string> = { confirmed: '已确认', waitlist: '候补', cancelled: '已取消', boarded: '已上车', no_show: '未到', released: '已释放' };
  return map[s] || s;
}

function dayTypeLabel(d: DayType) {
  const map: Record<DayType, string> = { weekday: '工作日', weekend: '周末', holiday: '节假日' };
  return map[d] || d;
}

function extraRouteTypeLabel(t: ExtraRouteType) {
  const map: Record<ExtraRouteType, string> = { makeup: '补班', reroute: '临时改线', temporary: '临时班次' };
  return map[t] || t;
}

function ScheduleManager({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [schedules, setSchedules] = useState<ScheduleType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    dayType: 'weekday' as DayType,
    effectiveDate: '',
    expiryDate: '',
    capacities: [] as { stationId: number; capacity: number }[],
  });

  const loadRoutes = useCallback(async () => {
    try {
      const r = await api.getRoutes();
      setRoutes(r);
      if (r.length > 0 && selectedRoute === 0) setSelectedRoute(r[0].id);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [showToast, selectedRoute]);

  const loadSchedules = useCallback(async () => {
    if (!selectedRoute) return;
    try {
      const s = await api.getSchedules(selectedRoute);
      setSchedules(s);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [selectedRoute, showToast]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const openNew = () => {
    const route = routes.find((r) => r.id === selectedRoute);
    if (!route?.stations) return;
    setForm({
      dayType: 'weekday',
      effectiveDate: '',
      expiryDate: '',
      capacities: route.stations.map((s) => ({ stationId: s.id, capacity: s.capacity })),
    });
    setShowForm(true);
  };

  const save = async () => {
    try {
      if (!selectedRoute) {
        showToast('请选择线路', 'error');
        return;
      }
      if (form.capacities.some((c) => c.capacity <= 0)) {
        showToast('站点容量必须大于0', 'error');
        return;
      }
      await api.createSchedule(selectedRoute, form);
      showToast('班次配置已创建');
      setShowForm(false);
      loadSchedules();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const updateCapacity = (stationId: number, capacity: number) => {
    setForm({
      ...form,
      capacities: form.capacities.map((c) =>
        c.stationId === stationId ? { ...c, capacity } : c
      ),
    });
  };

  const currentRoute = routes.find((r) => r.id === selectedRoute);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>班次容量维护</h2>
        <button className="btn btn-primary" onClick={openNew}>+ 新建版本</button>
      </div>

      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>选择线路</label>
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(Number(e.target.value))}>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {schedules.length > 0 && (
        <div className="card">
          <h3>版本历史</h3>
          <table>
            <thead>
              <tr>
                <th>版本号</th>
                <th>日期类型</th>
                <th>生效日期</th>
                <th>失效日期</th>
                <th>状态</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {schedules.sort((a, b) => b.version - a.version).map((s) => (
                <tr key={s.id}>
                  <td>v{s.version}</td>
                  <td>{dayTypeLabel(s.dayType)}</td>
                  <td>{s.effectiveDate || '-'}</td>
                  <td>{s.expiryDate || '-'}</td>
                  <td>
                    <span className={`badge ${s.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                      {s.isActive ? '生效中' : '已作废'}
                    </span>
                  </td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {schedules.length === 0 && <div className="empty-state"><p>暂无班次配置</p></div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>新建班次版本</h2>
            <div className="form-row">
              <div className="form-group">
                <label>日期类型 *</label>
                <select value={form.dayType} onChange={(e) => setForm({ ...form, dayType: e.target.value as DayType })}>
                  <option value="weekday">工作日</option>
                  <option value="weekend">周末</option>
                  <option value="holiday">节假日</option>
                </select>
              </div>
              <div className="form-group">
                <label>生效日期</label>
                <input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>失效日期</label>
                <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>

            <h3 style={{ marginTop: 16 }}>站点容量配置</h3>
            {currentRoute?.stations?.sort((a, b) => a.sequence - b.sequence).map((s) => {
              const cap = form.capacities.find((c) => c.stationId === s.id);
              return (
                <div key={s.id} className="form-row" style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>站点</label>
                    <input value={`${s.sequence}. ${s.name}`} disabled />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>容量 *</label>
                    <input type="number" value={cap?.capacity || 0} onChange={(e) => updateCapacity(s.id, Number(e.target.value))} />
                  </div>
                </div>
              );
            })}

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

function ExtraRouteManager({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [extraRoutes, setExtraRoutes] = useState<ExtraRouteInfoType[]>([]);
  const [filterType, setFilterType] = useState<ExtraRouteType | ''>('');
  const [filterDate, setFilterDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    routeId: 0,
    originalRouteId: 0,
    type: 'makeup' as ExtraRouteType,
    travelDate: '',
    departureTime: '07:30',
    note: '',
  });

  const loadRoutes = useCallback(async () => {
    try {
      const r = await api.getRoutes();
      setRoutes(r);
      if (r.length > 0 && form.routeId === 0) {
        setForm((f) => ({ ...f, routeId: r[0].id }));
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [showToast, form.routeId]);

  const loadExtraRoutes = useCallback(async () => {
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (filterDate) params.date = filterDate;
      const e = await api.getExtraRoutes(params);
      setExtraRoutes(e);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [filterType, filterDate, showToast]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);
  useEffect(() => { loadExtraRoutes(); }, [loadExtraRoutes]);

  const openNew = () => {
    setForm({
      routeId: routes[0]?.id || 0,
      originalRouteId: routes[0]?.id || 0,
      type: 'makeup',
      travelDate: '',
      departureTime: '07:30',
      note: '',
    });
    setShowForm(true);
  };

  const save = async () => {
    try {
      if (!form.routeId || !form.travelDate || !form.departureTime) {
        showToast('请填写完整信息', 'error');
        return;
      }
      await api.createExtraRoute(form);
      showToast(`${extraRouteTypeLabel(form.type)}已创建`);
      setShowForm(false);
      loadExtraRoutes();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const processLeaves = async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const result = await api.processLeaveReleases(today);
      showToast(`已处理 ${result.released} 个请假释放，递补 ${result.promoted} 个候补`);
      loadExtraRoutes();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>补班与临时改线</h2>
        <div>
          <button className="btn btn-outline" style={{ marginRight: 8 }} onClick={processLeaves}>处理今日请假释放</button>
          <button className="btn btn-primary" onClick={openNew}>+ 新建</button>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>类型</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as ExtraRouteType | '')}>
            <option value="">全部</option>
            <option value="makeup">补班</option>
            <option value="reroute">临时改线</option>
            <option value="temporary">临时班次</option>
          </select>
        </div>
        <div className="form-group">
          <label>日期</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
      </div>

      {extraRoutes.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>类型</th>
                <th>线路</th>
                <th>日期</th>
                <th>发车时间</th>
                <th>状态</th>
                <th>备注</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {extraRoutes.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className={`badge badge-${e.type === 'makeup' ? 'confirmed' : e.type === 'reroute' ? 'waitlist' : 'boarding'}`}>
                      {extraRouteTypeLabel(e.type)}
                    </span>
                  </td>
                  <td>{e.route?.name || '-'}</td>
                  <td>{e.travelDate}</td>
                  <td>{e.departureTime}</td>
                  <td>
                    <span className={`badge badge-${e.status === 'active' ? 'confirmed' : e.status === 'cancelled' ? 'cancelled' : 'waitlist'}`}>
                      {e.status === 'pending' ? '待生效' : e.status === 'active' ? '生效中' : e.status === 'completed' ? '已完成' : '已取消'}
                    </span>
                  </td>
                  <td>{e.note || '-'}</td>
                  <td>{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {extraRoutes.length === 0 && <div className="empty-state"><p>暂无补班/改线记录</p></div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>新建补班/改线</h2>
            <div className="form-row">
              <div className="form-group">
                <label>类型 *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ExtraRouteType })}>
                  <option value="makeup">补班</option>
                  <option value="reroute">临时改线</option>
                  <option value="temporary">临时班次</option>
                </select>
              </div>
              <div className="form-group">
                <label>线路 *</label>
                <select value={form.routeId} onChange={(e) => setForm({ ...form, routeId: Number(e.target.value) })}>
                  {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>原线路</label>
                <select value={form.originalRouteId} onChange={(e) => setForm({ ...form, originalRouteId: Number(e.target.value) })}>
                  <option value={0}>无</option>
                  {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>日期 *</label>
                <input type="date" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>发车时间 *</label>
                <input value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} placeholder="HH:mm" />
              </div>
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} />
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

function OperationOverview({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 10));
  const [overview, setOverview] = useState<OperationOverviewType | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventType[]>([]);

  useEffect(() => { api.getRoutes().then(setRoutes).catch(() => {}); }, []);

  const load = useCallback(async () => {
    if (!selectedRoute || !travelDate) return;
    try {
      const [o, t] = await Promise.all([
        api.getOperationOverview(selectedRoute, travelDate),
        api.getBookingTimeline(selectedRoute, travelDate),
      ]);
      setOverview(o);
      setTimeline(t);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [selectedRoute, travelDate, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (routes.length > 0 && selectedRoute === 0) setSelectedRoute(routes[0].id);
  }, [routes, selectedRoute]);

  const refresh = () => {
    load();
    showToast('数据已刷新');
  };

  const timelineIcon = (type: string) => {
    const map: Record<string, string> = {
      booking_created: '🎫',
      booking_cancelled: '❌',
      waitlist_promoted: '⬆️',
      rescheduled: '🔄',
      leave_released: '🏖️',
      late_released: '⏰',
      boarded: '✅',
      no_show: '⚠️',
      released: '🔓',
      schedule_changed: '📅',
    };
    return map[type] || '📝';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>运营总览</h2>
        <button className="btn btn-outline" onClick={refresh}>🔄 刷新</button>
      </div>

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

      {overview && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="value" style={{ color: '#2563eb' }}>v{overview.scheduleVersion}</div>
              <div className="label">班次版本 · {dayTypeLabel(overview.scheduleDayType)}</div>
            </div>
            <div className="stat-card"><div className="value" style={{ color: '#16a34a' }}>{overview.totalConfirmed}</div><div className="label">已确认</div></div>
            <div className="stat-card"><div className="value" style={{ color: '#d97706' }}>{overview.totalWaitlist}</div><div className="label">候补中</div></div>
            <div className="stat-card"><div className="value" style={{ color: '#2563eb' }}>{overview.totalBoarded}</div><div className="label">已上车</div></div>
            <div className="stat-card"><div className="value" style={{ color: '#64748b' }}>{overview.totalCapacity}</div><div className="label">总容量</div></div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>站点占用情况</h3>
            <table>
              <thead>
                <tr>
                  <th>站点</th>
                  <th>容量</th>
                  <th>已确认</th>
                  <th>候补</th>
                  <th>已上车</th>
                  <th>可用</th>
                  <th>占用率</th>
                </tr>
              </thead>
              <tbody>
                {overview.stationOccupancy.map((s) => (
                  <tr key={s.stationId}>
                    <td>{s.stationName}</td>
                    <td>{s.capacity}</td>
                    <td>{s.confirmed}</td>
                    <td>{s.waitlist}</td>
                    <td>{s.boarded}</td>
                    <td style={{ color: s.available > 0 ? 'var(--success)' : 'var(--danger)' }}>{s.available}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(s.occupancyRate * 100, 100)}%`,
                              background: s.occupancyRate >= 1 ? '#dc2626' : s.occupancyRate >= 0.8 ? '#d97706' : '#16a34a',
                            }}
                          />
                        </div>
                        <span style={{ minWidth: 50, textAlign: 'right' }}>{(s.occupancyRate * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>迟到释放 ({overview.lateReleases.length})</h3>
            {overview.lateReleases.length > 0 ? (
              <table>
                <thead>
                  <tr><th>员工</th><th>站点</th><th>释放时间</th><th>原因</th><th>距发车</th></tr>
                </thead>
                <tbody>
                  {overview.lateReleases.map((r) => (
                    <tr key={r.bookingId}>
                      <td>{r.userName}</td>
                      <td>{r.stationName}</td>
                      <td>{new Date(r.releasedAt).toLocaleString()}</td>
                      <td>{r.reason}</td>
                      <td>{r.minutesBeforeDeparture}分钟</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty-state" style={{ padding: '20px 0' }}><p>暂无迟到释放记录</p></div>}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>候补递补 ({overview.promotions.length})</h3>
            {overview.promotions.length > 0 ? (
              <table>
                <thead>
                  <tr><th>员工</th><th>站点</th><th>递补时间</th><th>原因</th><th>原候补位</th></tr>
                </thead>
                <tbody>
                  {overview.promotions.map((p) => (
                    <tr key={p.bookingId}>
                      <td>{p.userName}</td>
                      <td>{p.stationName}</td>
                      <td>{new Date(p.promotedAt).toLocaleString()}</td>
                      <td>
                        <span className="badge badge-confirmed">
                          {p.reason === 'cancel' ? '取消释放' : p.reason === 'leave' ? '请假释放' : p.reason === 'no_show' ? '未到释放' : p.reason === 'rebook' ? '改签释放' : '补班释放'}
                        </span>
                      </td>
                      <td>#{p.previousPosition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty-state" style={{ padding: '20px 0' }}><p>暂无候补递补记录</p></div>}
          </div>

          <div className="card">
            <h3>状态时间线</h3>
            {timeline.length > 0 ? (
              <div style={{ padding: '16px 0' }}>
                {timeline.map((event, idx) => (
                  <div key={event.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    {idx < timeline.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: 15,
                        top: 36,
                        bottom: -8,
                        width: 2,
                        background: '#e2e8f0',
                      }} />
                    )}
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 16,
                      zIndex: 1,
                    }}>
                      {timelineIcon(event.type)}
                    </div>
                    <div style={{ flex: 1, paddingBottom: idx < timeline.length - 1 ? 16 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <strong>{event.description}</strong>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {event.userName && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                          操作人: {event.userName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state" style={{ padding: '20px 0' }}><p>暂无时间线记录</p></div>}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, textAlign: 'right' }}>
            数据更新时间: {new Date(overview.lastUpdated).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
