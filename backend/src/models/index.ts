import User from './User';
import Route from './Route';
import Station from './Station';
import Booking from './Booking';
import LeaveRecord from './LeaveRecord';
import BoardingRecord from './BoardingRecord';

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

export { User, Route, Station, Booking, LeaveRecord, BoardingRecord };
