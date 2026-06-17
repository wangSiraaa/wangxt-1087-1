import User from './User';
import Route from './Route';
import Station from './Station';
import Booking from './Booking';
import LeaveRecord from './LeaveRecord';
import BoardingRecord from './BoardingRecord';
import Schedule from './Schedule';
import ScheduleStationCapacity from './ScheduleStationCapacity';
import ExtraRoute from './ExtraRoute';
import WaitlistPromotion from './WaitlistPromotion';
import BookingAuditLog from './BookingAuditLog';

Route.hasMany(Station, { foreignKey: 'routeId', as: 'stations' });
Station.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

Route.hasMany(Booking, { foreignKey: 'routeId', as: 'bookings' });
Booking.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

Station.hasMany(Booking, { foreignKey: 'stationId', as: 'bookings' });
Booking.belongsTo(Station, { foreignKey: 'stationId', as: 'station' });

User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(LeaveRecord, { foreignKey: 'userId', as: 'leaveRecords' });
LeaveRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(BoardingRecord, { foreignKey: 'userId', as: 'boardingRecords' });
BoardingRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Route.hasMany(BoardingRecord, { foreignKey: 'routeId', as: 'boardingRecords' });
BoardingRecord.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

Station.hasMany(BoardingRecord, { foreignKey: 'stationId', as: 'boardingRecords' });
BoardingRecord.belongsTo(Station, { foreignKey: 'stationId', as: 'station' });

Booking.hasOne(BoardingRecord, { foreignKey: 'bookingId', as: 'boardingRecord' });
BoardingRecord.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

Route.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });
User.hasMany(Route, { foreignKey: 'driverId', as: 'drivingRoutes' });

Route.hasMany(Schedule, { foreignKey: 'routeId', as: 'schedules' });
Schedule.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

Schedule.hasMany(ScheduleStationCapacity, { foreignKey: 'scheduleId', as: 'capacities' });
ScheduleStationCapacity.belongsTo(Schedule, { foreignKey: 'scheduleId', as: 'schedule' });
ScheduleStationCapacity.belongsTo(Station, { foreignKey: 'stationId', as: 'station' });

Route.hasMany(ExtraRoute, { foreignKey: 'routeId', as: 'extraRoutes' });
ExtraRoute.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
ExtraRoute.belongsTo(Route, { foreignKey: 'originalRouteId', as: 'originalRoute' });
ExtraRoute.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });

ExtraRoute.hasMany(Booking, { foreignKey: 'extraRouteId', as: 'bookings' });
Booking.belongsTo(ExtraRoute, { foreignKey: 'extraRouteId', as: 'extraRoute' });

Booking.belongsTo(Booking, { foreignKey: 'originalBookingId', as: 'originalBooking' });
Booking.hasMany(Booking, { foreignKey: 'originalBookingId', as: 'rebookedBookings' });

WaitlistPromotion.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
WaitlistPromotion.belongsTo(User, { foreignKey: 'userId', as: 'user' });
WaitlistPromotion.belongsTo(Booking, { foreignKey: 'promotedFromBookingId', as: 'promotedFromBooking' });

BookingAuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
BookingAuditLog.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

export {
  User,
  Route,
  Station,
  Booking,
  LeaveRecord,
  BoardingRecord,
  Schedule,
  ScheduleStationCapacity,
  ExtraRoute,
  WaitlistPromotion,
  BookingAuditLog,
};
