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
};
