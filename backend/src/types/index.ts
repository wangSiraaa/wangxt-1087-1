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
  RELEASED = 'released',
}

export type DayType = 'weekday' | 'weekend' | 'holiday';
export type ExtraRouteType = 'makeup' | 'reroute' | 'temporary';
export type PromotionReason = 'cancel' | 'leave' | 'no_show' | 'rebook' | 'extra_route';
export type AuditAction = 'create' | 'cancel' | 'rebook' | 'waitlist' | 'promote' | 'board' | 'modify' | 'release';
export type AuditChannel = 'web' | 'mobile' | 'api' | 'system';
export type ExtraRouteStatus = 'pending' | 'active' | 'completed' | 'cancelled';

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
  driver?: User;
  stations?: Station[];
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
  route?: Route;
}

export interface Schedule {
  id: number;
  routeId: number;
  dayType: DayType;
  effectiveDate?: string;
  expiryDate?: string;
  isActive: boolean;
  version: number;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
  capacities?: ScheduleStationCapacity[];
  route?: Route;
}

export interface ScheduleStationCapacity {
  id: number;
  scheduleId: number;
  stationId: number;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
  station?: Station;
}

export interface ExtraRoute {
  id: number;
  routeId: number;
  originalRouteId?: number;
  type: ExtraRouteType;
  travelDate: string;
  departureTime: string;
  returnTime?: string;
  vehiclePlate?: string;
  driverId?: number;
  reason?: string;
  status: ExtraRouteStatus;
  createdBy?: number;
  approvedBy?: number;
  createdAt: Date;
  updatedAt: Date;
  route?: Route;
  originalRoute?: Route;
  driver?: User;
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
  isWaitlistPromoted?: boolean;
  promotedAt?: Date;
  promotedReason?: PromotionReason;
  originalBookingId?: number;
  extraRouteId?: number;
  releaseReason?: string;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  route?: Route;
  station?: Station;
  originalBooking?: Booking;
  extraRoute?: ExtraRoute;
}

export interface WaitlistPromotion {
  id: number;
  bookingId: number;
  userId: number;
  routeId: number;
  stationId: number;
  travelDate: string;
  previousStatus: string;
  previousWaitlistPosition?: number;
  promotedFromBookingId?: number;
  reason: PromotionReason;
  releasedByUserId?: number;
  promotedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  booking?: Booking;
  user?: User;
  promotedFromBooking?: Booking;
}

export interface BookingAuditLog {
  id: number;
  bookingId?: number;
  userId: number;
  routeId: number;
  stationId?: number;
  travelDate: string;
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
  channel: AuditChannel;
  isReadonly: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  operator?: User;
}

export interface LeaveRecord {
  id: number;
  userId: number;
  leaveDate: string;
  leaveType: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
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
  isWaitlistPromoted?: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  route?: Route;
  station?: Station;
  booking?: Booking;
  driver?: User;
}

export interface CapacityInfo {
  capacity: number;
  confirmed: number;
  waitlist: number;
  available: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'booking' | 'waitlist' | 'promote' | 'cancel' | 'board' | 'release' | 'modify' | 'rebook';
  userId: number;
  userName?: string;
  description: string;
  details?: any;
}

export interface OperationOverview {
  routeId: number;
  routeName: string;
  travelDate: string;
  scheduleVersion: number;
  scheduleDayType: DayType;
  totalCapacity: number;
  totalConfirmed: number;
  totalWaitlist: number;
  totalBoarded: number;
  totalReleased: number;
  stations: StationOccupancy[];
  stationOccupancy: StationOccupancy[];
  lateReleases: LateReleaseInfo[];
  promotions: PromotionInfo[];
  lastUpdated: string;
}

export interface StationOccupancy {
  stationId: number;
  stationName: string;
  sequence: number;
  capacity: number;
  confirmed: number;
  waitlist: number;
  boarded: number;
  available: number;
  occupancyRate: number;
}

export interface LateReleaseInfo {
  bookingId: number;
  userId: number;
  userName: string;
  stationName: string;
  releasedAt: Date;
  reason: string;
  minutesBeforeDeparture: number;
}

export interface PromotionInfo {
  bookingId: number;
  userId: number;
  userName: string;
  stationName: string;
  previousPosition: number;
  promotedAt: Date;
  reason: PromotionReason;
  releasedByName?: string;
}

export interface DriverBoardingInfo {
  bookingId: number;
  userId: number;
  userName: string;
  employeeId: string;
  stationId: number;
  stationName: string;
  status: BookingStatus;
  isWaitlistPromoted: boolean;
  promotedReason?: PromotionReason;
  releasedInfo?: {
    releasedAt: Date;
    reason: string;
    releasedByName?: string;
  };
  boardingSequence?: number;
}
