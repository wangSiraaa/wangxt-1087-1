import { useState, useEffect, useCallback } from 'react';
import { api, RouteType, BookingType, UserType, BoardingRecordType } from '../api';
import dayjs from 'dayjs';

interface Props {
  tab: string;
  currentUser: UserType;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function DriverPage({ tab, currentUser, showToast }: Props) {
  return (
    <>
      {tab === 'route' && <MyRoute currentUser={currentUser} showToast={showToast} />}
      {tab === 'board' && <ConfirmBoarding currentUser={currentUser} showToast={showToast} />}
      {tab === 'history' && <BoardingHistory currentUser={currentUser} showToast={showToast} />}
    </>
  );
}

function MyRoute({ currentUser, showToast }: { currentUser: UserType; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [routes, setRoutes] = useState<RouteType[]>([]);

  useEffect(() => {
    api.getRoutes().then((all) => {
      setRoutes(all.filter((r) => r.driverId === currentUser.id));
    }).catch((e) => showToast(e.message, 'error'));
  }, [currentUser.id, showToast]);

  return (
    <div>
      <h2>我的线路</h2>
      {routes.map((route) => (
        <div key={route.id} className="driver-route-panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">
            {route.name} · {route.direction === 'up' ? '上行' : '下行'} · 发车 {route.departureTime}
            {route.vehiclePlate && <span style={{ marginLeft: 12 }}>🚐 {route.vehiclePlate}</span>}
          </div>
          {(route.stations || []).sort((a, b) => a.sequence - b.sequence).map((s) => (
            <div key={s.id} className="driver-station-item">
              <div>
                <span className="driver-station-name">{s.sequence}. {s.name}</span>
                {s.arriveTime && <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)' }}>{s.arriveTime}</span>}
              </div>
              <span className="driver-station-count">容量 {s.capacity}</span>
            </div>
          ))}
        </div>
      ))}
      {routes.length === 0 && (
        <div className="empty-state"><div className="icon">🚍</div><p>暂未分配线路</p></div>
      )}
    </div>
  );
}

function ConfirmBoarding({ currentUser, showToast }: { currentUser: UserType; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [travelDate, setTravelDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [bookings, setBookings] = useState<BookingType[]>([]);

  useEffect(() => {
    api.getRoutes().then((all) => {
      const mine = all.filter((r) => r.driverId === currentUser.id);
      setRoutes(mine);
      if (mine.length > 0) setSelectedRoute(mine[0].id);
    }).catch(() => {});
  }, [currentUser.id]);

  const load = useCallback(async () => {
    if (!selectedRoute || !travelDate) return;
    try {
      const b = await api.getRouteBookings(selectedRoute, travelDate);
      setBookings(b);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [selectedRoute, travelDate, showToast]);

  useEffect(() => { load(); }, [load]);

  const confirmBoarding = async (booking: BookingType) => {
    try {
      await api.confirmBoarding(booking.id, currentUser.id);
      showToast(`${booking.user?.name || '员工'}已确认上车`);
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const waitlistBookings = bookings.filter((b) => b.status === 'waitlist');
  const boardedBookings = bookings.filter((b) => b.status === 'boarded');

  return (
    <div>
      <h2>确认上车</h2>

      <div className="form-row" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>线路</label>
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(Number(e.target.value))}>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>日期</label>
          <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="value" style={{ color: '#16a34a' }}>{confirmedBookings.length}</div><div className="label">待上车</div></div>
        <div className="stat-card"><div className="value" style={{ color: '#d97706' }}>{waitlistBookings.length}</div><div className="label">候补中</div></div>
        <div className="stat-card"><div className="value" style={{ color: '#2563eb' }}>{boardedBookings.length}</div><div className="label">已上车</div></div>
      </div>

      {confirmedBookings.length > 0 && (
        <div className="card">
          <h3>待上车乘客</h3>
          <table>
            <thead><tr><th>员工</th><th>站点</th><th>预约时间</th><th>操作</th></tr></thead>
            <tbody>
              {confirmedBookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.user?.name || '-'}</td>
                  <td>{b.station?.name || '-'}</td>
                  <td>{new Date(b.createdAt).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-success btn-sm" onClick={() => confirmBoarding(b)}>确认上车</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {boardedBookings.length > 0 && (
        <div className="card">
          <h3>已上车</h3>
          <table>
            <thead><tr><th>员工</th><th>站点</th><th>上车时间</th></tr></thead>
            <tbody>
              {boardedBookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.user?.name || '-'}</td>
                  <td>{b.station?.name || '-'}</td>
                  <td>{b.boardedAt ? new Date(b.boardedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bookings.length === 0 && (
        <div className="empty-state"><div className="icon">📋</div><p>当日暂无预约</p></div>
      )}
    </div>
  );
}

function BoardingHistory({ currentUser, showToast }: { currentUser: UserType; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [records, setRecords] = useState<BoardingRecordType[]>([]);
  const [filterDate, setFilterDate] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api.getBoardingRecords(undefined, filterDate || undefined);
      const mine = r.filter((rec) => rec.driverId === currentUser.id || rec.route?.driverId === currentUser.id);
      setRecords(mine);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [filterDate, currentUser.id, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h2>上车记录</h2>
      <div className="form-group" style={{ maxWidth: 250, marginBottom: 16 }}>
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} placeholder="按日期筛选" />
      </div>

      <div className="card">
        <table>
          <thead><tr><th>员工</th><th>线路</th><th>站点</th><th>乘车日期</th><th>上车时间</th></tr></thead>
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
        {records.length === 0 && <div className="empty-state"><p>暂无记录</p></div>}
      </div>
    </div>
  );
}
