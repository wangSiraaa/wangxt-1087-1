export enum Role {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  DRIVER = 'driver',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  WAITLIST = 'waitlist',
  CANCELLED = 'cancelled',
  BOARDED = 'boarded',
  NO_SHOW = 'no_show',
}

export interface User {
  id: number;
  name: string;
  employeeId: string;
  role: Role;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Route {
  id: number;
  name: string;
  description?: string;
  direction: 'up' | 'down';
  departureTime: string;
  returnTime?: string;
  vehiclePlate?: string;
  driverId?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Station {
  id: number;
  routeId: number;
  name: string;
  sequence: number;
  capacity: number;
  arriveTime?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: number;
  userId: number;
  routeId: number;
  stationId: number;
  travelDate: string;
  status: BookingStatus;
  waitlistPosition?: number;
  boardedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRecord {
  id: number;
  userId: number;
  leaveDate: string;
  leaveType: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardingRecord {
  id: number;
  bookingId: number;
  userId: number;
  routeId: number;
  stationId: number;
  travelDate: string;
  boardedAt: Date;
  driverId?: number;
  createdAt: Date;
  updatedAt: Date;
}
