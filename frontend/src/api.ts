const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || '请求失败');
  return json.data as T;
}

export enum BookingSource {
  DIRECT = 'direct',
  WAITLIST_PROMOTED = 'waitlist_promoted',
  RESCHEDULE = 'reschedule',
  MAKEUP = 'makeup',
}

export enum DayType {
  WORKDAY = 'workday',
  WEEKEND = 'weekend',
  HOLIDAY = 'holiday',
}

export enum RescheduleType {
  TO_WAITLIST = 'to_waitlist',
  TO_MAKEUP = 'to_makeup',
  TO_OTHER = 'to_other',
}

export enum TimelineEventTypeEnum {
  BOOKING_CREATED = 'booking_created',
  BOOKING_CANCELLED = 'booking_cancelled',
  WAITLIST_PROMOTED = 'waitlist_promoted',
  RESCHEDULED = 'rescheduled',
  LEAVE_RELEASED = 'leave_released',
  LATE_RELEASED = 'late_released',
  BOARDED = 'boarded',
  NO_SHOW = 'no_show',
  ROUTE_DETOURED = 'route_detoured',
  SCHEDULE_CHANGED = 'schedule_changed',
  RELEASED = 'released',
}

export type DayType = 'weekday' | 'weekend' | 'holiday';
export type ExtraRouteType = 'makeup' | 'reroute' | 'temporary';
export type PromotionReason = 'cancel' | 'leave' | 'no_show' | 'rebook' | 'extra_route';
export type AuditAction = 'create' | 'cancel' | 'rebook' | 'waitlist' | 'promote' | 'board' | 'modify' | 'release';
export type AuditChannel = 'web' | 'mobile' | 'api' | 'system';
export type ExtraRouteStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface RouteType {
  id: number;
  name: string;
  description?: string;
  direction: 'up' | 'down';
  departureTime: string;
  returnTime?: string;
  vehiclePlate?: string;
  driverId?: number;
  isActive: boolean;
  currentVersion: number;
  stations?: StationType[];
  driver?: UserType;
  createdAt: string;
  updatedAt: string;
}

export interface StationType {
  id: number;
  routeId: number;
  name: string;
  sequence: number;
  capacity: number;
  makeupShiftId?: number;
  capacityWorkday: number;
  capacityWeekend: number;
  capacityHoliday: number;
  arriveTime?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserType {
  id: number;
  name: string;
  employeeId: string;
  role: 'admin' | 'employee' | 'driver';
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingType {
  id: number;
  userId: number;
  routeId: number;
  stationId: number;
  travelDate: string;
  status: 'confirmed' | 'waitlist' | 'cancelled' | 'boarded' | 'no_show';
  waitlistPosition?: number;
  boardedAt?: string;
  cancelledAt?: string;
  makeupShiftId?: number;
  source: BookingSource;
  originalBookingId?: number;
  rescheduleType?: RescheduleType;
  promotedFromWaitlistAt?: string;
  leaveReleasedAt?: string;
  lateReleasedAt?: string;
  noShowAt?: string;
  route?: RouteType;
  station?: StationType;
  user?: UserType;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRecordType {
  id: number;
  userId: number;
  leaveDate: string;
  leaveType: string;
  reason?: string;
  user?: UserType;
  createdAt: string;
  updatedAt: string;
}

export interface BoardingRecordType {
  id: number;
  bookingId: number;
  userId: number;
  routeId: number;
  stationId: number;
  travelDate: string;
  boardedAt: string;
  driverId?: number;
  wasWaitlistPromoted: boolean;
  wasLeaveReleased: boolean;
  wasLateReleased: boolean;
  user?: UserType;
  route?: RouteType;
  station?: StationType;
  createdAt: string;
  updatedAt: string;
}

export interface CapacityInfo {
  capacity: number;
  confirmed: number;
  waitlist: number;
  available: number;
}

export interface RouteVersionType {
  id: number;
  routeId: number;
  version: number;
  changeNote?: string;
  previousStationSnapshot?: string;
  changedBy?: number;
  createdAt: string;
  route?: RouteType;
  changer?: UserType;
}

export interface RouteScheduleType {
  id: number;
  routeId: number;
  dayType: DayType;
  effectiveDate: string;
  capacityWorkday: number;
  capacityWeekend: number;
  capacityHoliday: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MakeupShiftType {
  id: number;
  routeId: number;
  shiftDate: string;
  departureTime: string;
  vehiclePlate?: string;
  driverId?: number;
  note?: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  route?: RouteType;
  driver?: UserType;
  stations?: StationType[];
}

export interface WaitlistPromotionType {
  id: number;
  bookingId: number;
  promotedAt: string;
  fromPosition: number;
  reason: string;
  createdAt: string;
  booking?: BookingType;
}

export interface RescheduleRecordType {
  id: number;
  originalBookingId: number;
  newBookingId?: number;
  rescheduleType: RescheduleType;
  rescheduledAt: string;
  reason?: string;
  isAuditOnly: boolean;
  operatorId?: number;
  createdAt: string;
  originalBooking?: BookingType;
  newBooking?: BookingType;
  operator?: UserType;
}

export interface LateReleaseType {
  id: number;
  bookingId: number;
  userId: number;
  routeId: number;
  stationId: number;
  travelDate: string;
  releasedAt: string;
  minutesLate: number;
  releasedBy?: number;
  note?: string;
  createdAt: string;
  booking?: BookingType;
  user?: UserType;
  route?: RouteType;
  station?: StationType;
  releaser?: UserType;
}

export interface TimelineEventType {
  id: number;
  type: TimelineEventTypeEnum;
  timestamp: string;
  userId?: number;
  userName?: string;
  bookingId?: number;
  routeId?: number;
  stationId?: number;
  travelDate?: string;
  description: string;
  metadata?: string;
}

export interface ScheduleType {
  id: number;
  routeId: number;
  dayType: DayType;
  effectiveDate?: string;
  expiryDate?: string;
  isActive: boolean;
  version: number;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  capacities?: ScheduleStationCapacityType[];
  route?: RouteType;
  creator?: UserType;
}

export interface ScheduleStationCapacityType {
  id: number;
  scheduleId: number;
  stationId: number;
  capacity: number;
  createdAt: string;
  updatedAt: string;
  station?: StationType;
}

export interface ExtraRouteType {
  id: number;
  routeId: number;
  originalRouteId?: number;
  type: ExtraRouteType;
  travelDate: string;
  departureTime: string;
  status: ExtraRouteStatus;
  note?: string;
  createdBy?: number;
  approvedBy?: number;
  createdAt: string;
  updatedAt: string;
  route?: RouteType;
  originalRoute?: RouteType;
  creator?: UserType;
  approver?: UserType;
}

export interface WaitlistPromotionType {
  id: number;
  bookingId: number;
  userId: number;
  previousStatus: string;
  previousWaitlistPosition?: number;
  promotedFromBookingId?: number;
  reason: PromotionReason;
  releasedByUserId?: number;
  promotedAt: string;
  createdAt: string;
  booking?: BookingType;
  user?: UserType;
  promotedFromBooking?: BookingType;
  releasedByUser?: UserType;
}

export interface BookingAuditLogType {
  id: number;
  bookingId?: number;
  userId: number;
  action: AuditAction;
  previousStatus?: string;
  newStatus?: string;
  previousRouteId?: number;
  previousStationId?: number;
  previousTravelDate?: string;
  newRouteId?: number;
  newStationId?: number;
  newTravelDate?: string;
  reason?: string;
  operatorId?: number;
  isReadonly: boolean;
  channel?: AuditChannel;
  createdAt: string;
  booking?: BookingType;
  user?: UserType;
  operator?: UserType;
}

export interface DriverBoardingInfoType {
  bookingId: number;
  userId: number;
  userName: string;
  employeeId: string;
  stationId: number;
  stationName: string;
  status: string;
  isWaitlistPromoted: boolean;
  promotedAt?: string;
  promotionReason?: string;
  isLeaveReleased: boolean;
  releasedAt?: string;
  releaseReason?: string;
  boardedAt?: string;
}

export interface StationOccupancyType {
  stationId: number;
  stationName: string;
  capacity: number;
  confirmed: number;
  waitlist: number;
  boarded: number;
  available: number;
  occupancyRate: number;
}

export interface LateReleaseInfoType {
  bookingId: number;
  userId: number;
  userName: string;
  stationName: string;
  releasedAt: string;
  reason: string;
  minutesBeforeDeparture: number;
}

export interface PromotionInfoType {
  bookingId: number;
  userId: number;
  userName: string;
  stationName: string;
  promotedAt: string;
  reason: string;
  previousPosition: number;
}

export interface OperationOverviewType {
  routeId: number;
  routeName: string;
  travelDate: string;
  scheduleVersion: number;
  scheduleDayType: DayType;
  totalCapacity: number;
  totalConfirmed: number;
  totalWaitlist: number;
  totalBoarded: number;
  stationOccupancy: StationOccupancyType[];
  lateReleases: LateReleaseInfoType[];
  promotions: PromotionInfoType[];
  lastUpdated: string;
}

export const api = {
  getRoutes: () => request<RouteType[]>('/routes'),
  getRoute: (id: number) => request<RouteType>(`/routes/${id}`),
  createRoute: (data: any) => request<RouteType>('/routes', { method: 'POST', body: JSON.stringify(data) }),
  updateRoute: (id: number, data: any) => request<RouteType>(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoute: (id: number) => request<void>(`/routes/${id}`, { method: 'DELETE' }),
  getStations: (routeId: number) => request<StationType[]>(`/routes/${routeId}/stations`),
  createStation: (data: any) => request<StationType>('/stations', { method: 'POST', body: JSON.stringify(data) }),
  updateStation: (id: number, data: any) => request<StationType>(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStation: (id: number) => request<void>(`/stations/${id}`, { method: 'DELETE' }),
  getCapacity: (stationId: number, travelDate: string) =>
    request<CapacityInfo>(`/stations/${stationId}/capacity?travelDate=${travelDate}`),
  createBooking: (data: { userId: number; routeId: number; stationId: number; travelDate: string }) =>
    request<BookingType>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id: number, userId: number) =>
    request<BookingType>(`/bookings/${id}?userId=${userId}`, { method: 'DELETE' }),
  getUserBookings: (userId: number, date?: string) =>
    request<BookingType[]>(`/bookings/user/${userId}` + (date ? `?date=${date}` : '')),
  getRouteBookings: (routeId: number, travelDate: string) =>
    request<BookingType[]>(`/bookings/route/${routeId}?travelDate=${travelDate}`),
  getBooking: (id: number) => request<BookingType>(`/bookings/${id}`),
  confirmBoarding: (id: number, driverId: number) =>
    request<BookingType>(`/bookings/${id}/board`, { method: 'POST', body: JSON.stringify({ driverId }) }),
  getUsers: (role?: string) => request<UserType[]>('/users' + (role ? `?role=${role}` : '')),
  getUser: (id: number) => request<UserType>(`/users/${id}`),
  createUser: (data: any) => request<UserType>('/users', { method: 'POST', body: JSON.stringify(data) }),
  getLeaves: (userId?: number, date?: string) =>
    request<LeaveRecordType[]>('/leaves' + (userId || date ? `?${userId ? `userId=${userId}&` : ''}${date ? `date=${date}` : ''}` : '')),
  createLeave: (data: any) => request<LeaveRecordType>('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  getBoardingRecords: (routeId?: number, travelDate?: string, stationId?: number) => {
    const p = new URLSearchParams();
    if (routeId) p.set('routeId', String(routeId));
    if (travelDate) p.set('travelDate', travelDate);
    if (stationId) p.set('stationId', String(stationId));
    const qs = p.toString();
    return request<BoardingRecordType[]>(`/boarding-records${qs ? `?${qs}` : ''}`);
  },
  getRouteVersions: (routeId: number) => request<RouteVersionType[]>(`/routes/${routeId}/versions`),
  createRouteVersion: (routeId: number, data: { changeNote: string; changedBy: number; previousSnapshot?: string }) =>
    request<RouteVersionType>(`/routes/${routeId}/versions`, { method: 'POST', body: JSON.stringify(data) }),
  getRouteSchedules: (routeId: number) => request<RouteScheduleType[]>(`/routes/${routeId}/schedules`),
  upsertRouteSchedule: (routeId: number, data: any) =>
    request<RouteScheduleType>(`/routes/${routeId}/schedules`, { method: 'POST', body: JSON.stringify(data) }),
  getMakeupShifts: (params?: { routeId?: number; date?: string }) => {
    const p = new URLSearchParams();
    if (params?.routeId) p.set('routeId', String(params.routeId));
    if (params?.date) p.set('date', params.date);
    return request<MakeupShiftType[]>(`/makeup-shifts${p.toString() ? `?${p.toString()}` : ''}`);
  },
  createMakeupShift: (data: any) => request<MakeupShiftType>('/makeup-shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateMakeupShift: (id: number, data: any) => request<MakeupShiftType>(`/makeup-shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMakeupShift: (id: number) => request<void>(`/makeup-shifts/${id}`, { method: 'DELETE' }),
  getWaitlistPromotions: (params?: { bookingId?: number; routeId?: number; travelDate?: string }) => {
    const p = new URLSearchParams();
    if (params?.bookingId) p.set('bookingId', String(params.bookingId));
    if (params?.routeId) p.set('routeId', String(params.routeId));
    if (params?.travelDate) p.set('travelDate', params.travelDate);
    return request<WaitlistPromotionType[]>(`/waitlist-promotions${p.toString() ? `?${p.toString()}` : ''}`);
  },
  rescheduleBooking: (id: number, data: { userId: number; rescheduleType: string; targetData?: any; reason?: string; operatorId?: number }) =>
    request<BookingType>(`/bookings/${id}/reschedule`, { method: 'POST', body: JSON.stringify(data) }),
  getRescheduleRecords: (params?: { bookingId?: number; userId?: number }) => {
    const p = new URLSearchParams();
    if (params?.bookingId) p.set('bookingId', String(params.bookingId));
    if (params?.userId) p.set('userId', String(params.userId));
    return request<RescheduleRecordType[]>(`/reschedule-records${p.toString() ? `?${p.toString()}` : ''}`);
  },
  processLeaveReleases: (travelDate: string) =>
    request<{ released: number; promoted: number }>('/leave-releases/process', { method: 'POST', body: JSON.stringify({ travelDate }) }),
  getLeaveReleases: (params?: { travelDate?: string; routeId?: number }) => {
    const p = new URLSearchParams();
    if (params?.travelDate) p.set('travelDate', params.travelDate);
    if (params?.routeId) p.set('routeId', String(params.routeId));
    return request<BookingType[]>(`/leave-releases${p.toString() ? `?${p.toString()}` : ''}`);
  },
  createLateRelease: (data: { bookingId: number; minutesLate: number; releasedBy: number; note?: string }) =>
    request<LateReleaseType>('/late-releases', { method: 'POST', body: JSON.stringify(data) }),
  getLateReleases: (params?: { routeId?: number; travelDate?: string }) => {
    const p = new URLSearchParams();
    if (params?.routeId) p.set('routeId', String(params.routeId));
    if (params?.travelDate) p.set('travelDate', params.travelDate);
    return request<LateReleaseType[]>(`/late-releases${p.toString() ? `?${p.toString()}` : ''}`);
  },
  markNoShow: (id: number, operatorId?: number) =>
    request<BookingType>(`/bookings/${id}/no-show`, { method: 'POST', body: JSON.stringify({ operatorId }) }),
  getTimeline: (params?: { routeId?: number; travelDate?: string; userId?: number; bookingId?: number }) => {
    const p = new URLSearchParams();
    if (params?.routeId) p.set('routeId', String(params.routeId));
    if (params?.travelDate) p.set('travelDate', params.travelDate);
    if (params?.userId) p.set('userId', String(params.userId));
    if (params?.bookingId) p.set('bookingId', String(params.bookingId));
    return request<TimelineEventType[]>(`/timeline${p.toString() ? `?${p.toString()}` : ''}`);
  },
  getSchedules: (routeId: number) => request<ScheduleType[]>(`/routes/${routeId}/schedules`),
  createSchedule: (routeId: number, data: { dayType: DayType; capacities: { stationId: number; capacity: number }[]; effectiveDate?: string; expiryDate?: string }) =>
    request<ScheduleType>(`/routes/${routeId}/schedules`, { method: 'POST', body: JSON.stringify(data) }),
  getScheduleForDate: (routeId: number, travelDate: string) =>
    request<ScheduleType>(`/routes/${routeId}/schedule-for-date?travelDate=${travelDate}`),
  getExtraRoutes: (params?: { routeId?: number; date?: string; type?: ExtraRouteType }) => {
    const p = new URLSearchParams();
    if (params?.routeId) p.set('routeId', String(params.routeId));
    if (params?.date) p.set('date', params.date);
    if (params?.type) p.set('type', params.type);
    return request<ExtraRouteType[]>(`/extra-routes${p.toString() ? `?${p.toString()}` : ''}`);
  },
  createExtraRoute: (data: { routeId: number; originalRouteId?: number; type: ExtraRouteType; travelDate: string; departureTime: string; note?: string }) =>
    request<ExtraRouteType>('/extra-routes', { method: 'POST', body: JSON.stringify(data) }),
  convertToWaitlist: (bookingId: number, userId: number, reason?: string) =>
    request<BookingType>(`/bookings/${bookingId}/waitlist`, { method: 'POST', body: JSON.stringify({ userId, reason }) }),
  rebookBooking: (bookingId: number, data: { userId: number; newRouteId?: number; newStationId?: number; newTravelDate?: string; reason?: string }) =>
    request<BookingType>(`/bookings/${bookingId}/rebook`, { method: 'POST', body: JSON.stringify(data) }),
  processLeaveReleases: (travelDate: string) =>
    request<{ released: number; promoted: number }>('/bookings/process-leaves', { method: 'POST', body: JSON.stringify({ travelDate }) }),
  getDriverBoardingList: (routeId: number, travelDate: string) =>
    request<DriverBoardingInfoType[]>(`/bookings/route/${routeId}/driver-boarding?travelDate=${travelDate}`),
  getOperationOverview: (routeId: number, travelDate: string) =>
    request<OperationOverviewType>(`/bookings/route/${routeId}/overview?travelDate=${travelDate}`),
  getBookingTimeline: (routeId: number, travelDate: string) =>
    request<TimelineEventType[]>(`/bookings/route/${routeId}/timeline?travelDate=${travelDate}`),
  getAuditLogs: (params?: { bookingId?: number; userId?: number; action?: AuditAction }) => {
    const p = new URLSearchParams();
    if (params?.bookingId) p.set('bookingId', String(params.bookingId));
    if (params?.userId) p.set('userId', String(params.userId));
    if (params?.action) p.set('action', params.action);
    return request<BookingAuditLogType[]>(`/audit-logs${p.toString() ? `?${p.toString()}` : ''}`);
  },
  getWaitlistPromotionHistory: (params?: { routeId?: number; travelDate?: string; bookingId?: number }) => {
    const p = new URLSearchParams();
    if (params?.routeId) p.set('routeId', String(params.routeId));
    if (params?.travelDate) p.set('travelDate', params.travelDate);
    if (params?.bookingId) p.set('bookingId', String(params.bookingId));
    return request<WaitlistPromotionType[]>(`/waitlist-promotions${p.toString() ? `?${p.toString()}` : ''}`);
  },
};
