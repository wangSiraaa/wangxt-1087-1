import { useState, useEffect, useCallback } from 'react';
import { api, RouteType, BookingType, UserType, CapacityInfo } from '../api';
import dayjs from 'dayjs';

interface Props {
  tab: string;
  currentUser: UserType;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function EmployeePage({ tab, currentUser, showToast }: Props) {
  return (
    <>
      {tab === 'book' && <BookingForm currentUser={currentUser} showToast={showToast} />}
      {tab === 'my' && <MyBookings currentUser={currentUser} showToast={showToast} />}
    </>
  );
}

function BookingForm({ currentUser, showToast }: { currentUser: UserType; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [selectedStation, setSelectedStation] = useState<number>(0);
  const [travelDate, setTravelDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [capacities, setCapacities] = useState<Record<number, CapacityInfo>>({});
  const [existingBooking, setExistingBooking] = useState<BookingType | null>(null);

  useEffect(() => {
    api.getRoutes().then((r) => {
      setRoutes(r);
      if (r.length > 0) {
        setSelectedRoute(r[0].id);
        const firstStation = r[0].stations?.[0];
        if (firstStation) setSelectedStation(firstStation.id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const route = routes.find((r) => r.id === selectedRoute);
    if (route?.stations?.length) {
      setSelectedStation(route.stations[0].id);
    }
  }, [selectedRoute, routes]);

  useEffect(() => {
    if (!travelDate) return;
    const route = routes.find((r) => r.id === selectedRoute);
    if (!route?.stations) return;
    Promise.all(
      route.stations.map((s) =>
        api.getCapacity(s.id, travelDate).then((c) => [s.id, c] as const).catch(() => null)
      )
    ).then((results) => {
      const map: Record<number, CapacityInfo> = {};
      results.forEach((r) => { if (r) map[r[0]] = r[1]; });
      setCapacities(map);
    });
  }, [selectedRoute, travelDate, routes]);

  useEffect(() => {
    if (!selectedRoute || !travelDate) return;
    api.getUserBookings(currentUser.id, travelDate).then((bookings) => {
      const match = bookings.find((b) => b.routeId === selectedRoute && b.status !== 'cancelled');
      setExistingBooking(match || null);
    }).catch(() => {});
  }, [selectedRoute, travelDate, currentUser.id]);

  const book = async () => {
    try {
      if (!selectedRoute || !selectedStation || !travelDate) {
        showToast('请选择线路、站点和日期', 'error');
        return;
      }
      const booking = await api.createBooking({
        userId: currentUser.id,
        routeId: selectedRoute,
        stationId: selectedStation,
        travelDate,
      });
      if (booking.status === 'waitlist') {
        showToast('站点已满，已加入候补队列');
      } else {
        showToast('预约成功！');
      }
      setExistingBooking(booking);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const cancel = async () => {
    if (!existingBooking) return;
    if (!confirm('确定取消预约？')) return;
    try {
      await api.cancelBooking(existingBooking.id, currentUser.id);
      showToast('预约已取消');
      setExistingBooking(null);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const currentRoute = routes.find((r) => r.id === selectedRoute);
  const currentStations = currentRoute?.stations || [];
  const currentCapacity = capacities[selectedStation];

  return (
    <div>
      <h2>预约乘车</h2>

      {existingBooking && (
        <div className="card" style={{ borderLeft: '4px solid var(--primary)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>您已预约</strong>
              <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
                {existingBooking.travelDate} ·
                <span className={`badge badge-${existingBooking.status}`} style={{ marginLeft: 8 }}>
                  {existingBooking.status === 'confirmed' ? '已确认' : existingBooking.status === 'waitlist' ? `候补 #${existingBooking.waitlistPosition}` : existingBooking.status}
                </span>
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={cancel}>取消预约</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="form-row">
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

        {currentRoute && (
          <div style={{ marginBottom: 16 }}>
            <div className="route-meta" style={{ marginBottom: 8 }}>
              <span>🕐 发车 {currentRoute.departureTime}</span>
              <span>🚐 {currentRoute.vehiclePlate || '未分配'}</span>
              <span>👤 {currentRoute.driver?.name || '未分配'}</span>
            </div>
          </div>
        )}

        <h3>选择上车站点</h3>
        {currentStations.map((s) => {
          const cap = capacities[s.id];
          const pct = cap ? (cap.confirmed / cap.capacity) * 100 : 0;
          const colorClass = pct >= 100 ? 'red' : pct >= 80 ? 'yellow' : 'green';
          const isSelected = selectedStation === s.id;

          return (
            <div
              key={s.id}
              onClick={() => setSelectedStation(s.id)}
              style={{
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 12,
                marginBottom: 8,
                cursor: 'pointer',
                background: isSelected ? '#eff6ff' : 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{s.name}</strong>
                  {s.arriveTime && <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)' }}>到站 {s.arriveTime}</span>}
                </div>
                {cap && (
                  <span style={{ fontSize: 13, color: cap.available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {cap.available > 0 ? `余 ${cap.available} 座` : '已满'}
                    {cap.waitlist > 0 && ` · 候补${cap.waitlist}人`}
                  </span>
                )}
              </div>
              <div className="capacity-bar">
                <div className={`capacity-bar-fill ${colorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={book} disabled={!selectedStation || !travelDate}>
            确认预约
          </button>
        </div>
      </div>
    </div>
  );
}

function MyBookings({ currentUser, showToast }: { currentUser: UserType; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [bookings, setBookings] = useState<BookingType[]>([]);
  const [filterDate, setFilterDate] = useState('');

  const load = useCallback(async () => {
    try {
      const b = await api.getUserBookings(currentUser.id, filterDate || undefined);
      setBookings(b);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [currentUser.id, filterDate, showToast]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (b: BookingType) => {
    if (!confirm('确定取消预约？')) return;
    try {
      await api.cancelBooking(b.id, currentUser.id);
      showToast('预约已取消');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const statusText = (s: string) => {
    const map: Record<string, string> = { confirmed: '已确认', waitlist: '候补中', cancelled: '已取消', boarded: '已上车', no_show: '未到' };
    return map[s] || s;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>我的预约</h2>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} placeholder="按日期筛选" />
        </div>
      </div>

      {bookings.map((b) => (
        <div key={b.id} className="booking-card">
          <div className="booking-info">
            <h4>{b.route?.name || '-'}</h4>
            <p>
              {b.travelDate} · {b.station?.name || '-'}
              {b.waitlistPosition && <span style={{ color: 'var(--warning)' }}> · 候补 #{b.waitlistPosition}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge badge-${b.status}`}>{statusText(b.status)}</span>
            {(b.status === 'confirmed' || b.status === 'waitlist') && (
              <button className="btn btn-danger btn-sm" onClick={() => cancel(b)}>取消</button>
            )}
          </div>
        </div>
      ))}

      {bookings.length === 0 && (
        <div className="empty-state">
          <div className="icon">🎫</div>
          <p>暂无预约记录</p>
        </div>
      )}
    </div>
  );
}
