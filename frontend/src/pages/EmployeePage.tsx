import { useState, useEffect, useCallback } from 'react';
import { api, RouteType, BookingType, UserType, CapacityInfo, ExtraRouteType, TimelineEventType } from '../api';
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
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingType | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventType[]>([]);
  const [extraRoutes, setExtraRoutes] = useState<ExtraRouteType[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [rebookForm, setRebookForm] = useState({
    newRouteId: 0,
    newStationId: 0,
    newTravelDate: '',
    reason: '',
  });

  const load = useCallback(async () => {
    try {
      const [b, r, er] = await Promise.all([
        api.getUserBookings(currentUser.id, filterDate || undefined),
        api.getRoutes(),
        api.getExtraRoutes({ date: new Date().toISOString().slice(0, 10), type: 'makeup' }),
      ]);
      setBookings(b);
      setRoutes(r);
      setExtraRoutes(er);
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

  const convertToWaitlist = async (b: BookingType) => {
    if (!confirm('确定将预约转为候补？这将释放您的座位给其他候补中用户。')) return;
    try {
      await api.convertToWaitlist(b.id, currentUser.id, '临时加班');
      showToast('已转为候补');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const openRebook = (b: BookingType) => {
    setSelectedBooking(b);
    setRebookForm({
      newRouteId: b.routeId,
      newStationId: b.stationId,
      newTravelDate: b.travelDate,
      reason: '',
    });
    setShowRebookModal(true);
  };

  const rebook = async () => {
    if (!selectedBooking) return;
    try {
      await api.rebookBooking(selectedBooking.id, {
        userId: currentUser.id,
        newRouteId: rebookForm.newRouteId || undefined,
        newStationId: rebookForm.newStationId || undefined,
        newTravelDate: rebookForm.newTravelDate || undefined,
        reason: rebookForm.reason,
      });
      showToast('改签成功');
      setShowRebookModal(false);
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const viewTimeline = async (b: BookingType) => {
    try {
      const t = await api.getBookingTimeline(b.routeId, b.travelDate);
      setTimeline(t.filter(ev => ev.bookingId === b.id || ev.userId === currentUser.id));
      setSelectedBooking(b);
      setShowTimelineModal(true);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const statusText = (s: string) => {
    const map: Record<string, string> = { confirmed: '已确认', waitlist: '候补中', cancelled: '已取消', boarded: '已上车', no_show: '未到', released: '已释放' };
    return map[s] || s;
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

  const selectedRoute = routes.find(r => r.id === rebookForm.newRouteId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>我的预约</h2>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} placeholder="按日期筛选" />
        </div>
      </div>

      {extraRoutes.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #d97706', background: '#fffbeb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>📢 今日有补班车次</strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {extraRoutes.length} 个补班车次可供改签
              </div>
            </div>
          </div>
        </div>
      )}

      {bookings.map((b) => (
        <div key={b.id} className="booking-card">
          <div className="booking-info">
            <h4>
              {b.route?.name || '-'}
              {b.isWaitlistPromoted && <span className="badge badge-confirmed" style={{ marginLeft: 8 }}>候补转正</span>}
              {b.extraRouteId && <span className="badge badge-waitlist" style={{ marginLeft: 8 }}>补班车</span>}
            </h4>
            <p>
              {b.travelDate} · {b.station?.name || '-'}
              {b.waitlistPosition && <span style={{ color: 'var(--warning)' }}> · 候补 #{b.waitlistPosition}</span>}
              {b.originalBookingId && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· 改签自 #{b.originalBookingId}</span>}
            </p>
            {b.releaseReason && (
              <p style={{ fontSize: 13, color: 'var(--warning)', marginTop: 4 }}>
                释放原因: {b.releaseReason}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge badge-${b.status}`}>{statusText(b.status)}</span>
            <button className="btn btn-outline btn-sm" onClick={() => viewTimeline(b)}>📋 时间线</button>
            {(b.status === 'confirmed') && (
              <>
                <button className="btn btn-warning btn-sm" onClick={() => convertToWaitlist(b)}>转候补</button>
                <button className="btn btn-primary btn-sm" onClick={() => openRebook(b)}>改签</button>
              </>
            )}
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

      {showRebookModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowRebookModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>改签预约</h2>
            <div className="card" style={{ marginBottom: 16, background: '#f1f5f9' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>当前预约</div>
              <div>
                <strong>{selectedBooking.route?.name}</strong> · {selectedBooking.travelDate} · {selectedBooking.station?.name}
              </div>
            </div>

            {extraRoutes.length > 0 && (
              <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>可选补班</div>
                {extraRoutes.map((er) => (
                  <div
                    key={er.id}
                    style={{
                      padding: '8px 12px',
                      marginTop: 8,
                      border: rebookForm.newRouteId === er.routeId && er.type === 'makeup' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: rebookForm.newRouteId === er.routeId && er.type === 'makeup' ? '#eff6ff' : 'white',
                    }}
                    onClick={() => setRebookForm({ ...rebookForm, newRouteId: er.routeId, newTravelDate: er.travelDate })}
                  >
                    <strong>🚌 补班 - {er.route?.name}</strong>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {er.travelDate} {er.departureTime} · {er.note || ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>目标线路</label>
                <select value={rebookForm.newRouteId} onChange={(e) => setRebookForm({ ...rebookForm, newRouteId: Number(e.target.value) })}>
                  {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>目标站点</label>
                <select value={rebookForm.newStationId} onChange={(e) => setRebookForm({ ...rebookForm, newStationId: Number(e.target.value) })}>
                  {selectedRoute?.stations?.sort((a, b) => a.sequence - b.sequence).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>乘车日期</label>
                <input type="date" value={rebookForm.newTravelDate} onChange={(e) => setRebookForm({ ...rebookForm, newTravelDate: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>改签原因</label>
              <select value={rebookForm.reason} onChange={(e) => setRebookForm({ ...rebookForm, reason: e.target.value })}>
                <option value="">请选择</option>
                <option value="临时加班">临时加班</option>
                <option value="行程变更">行程变更</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowRebookModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={rebook}>确认改签</button>
            </div>
          </div>
        </div>
      )}

      {showTimelineModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowTimelineModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>预约状态时间线</h2>
            <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
              {selectedBooking.route?.name} · {selectedBooking.travelDate} · {selectedBooking.station?.name}
            </div>
            {timeline.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
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
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state" style={{ padding: '40px 0' }}><p>暂无时间线记录</p></div>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowTimelineModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
