import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type AuditAction = 'create' | 'cancel' | 'rebook' | 'waitlist' | 'promote' | 'board' | 'modify' | 'release';
export type AuditChannel = 'web' | 'mobile' | 'api' | 'system';

interface BookingAuditLogAttributes {
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
}

interface BookingAuditLogCreationAttributes extends Optional<BookingAuditLogAttributes, 'id' | 'channel' | 'isReadonly'> {}

class BookingAuditLog extends Model<BookingAuditLogAttributes, BookingAuditLogCreationAttributes> implements BookingAuditLogAttributes {
  public id!: number;
  public bookingId?: number;
  public userId!: number;
  public routeId!: number;
  public stationId?: number;
  public travelDate!: string;
  public action!: AuditAction;
  public previousStatus?: string;
  public newStatus?: string;
  public previousRouteId?: number;
  public previousStationId?: number;
  public previousTravelDate?: string;
  public newRouteId?: number;
  public newStationId?: number;
  public newTravelDate?: string;
  public reason?: string;
  public operatorId?: number;
  public channel!: AuditChannel;
  public isReadonly!: boolean;
  public ipAddress?: string;
  public userAgent?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BookingAuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bookings', key: 'id' },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    routeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'routes', key: 'id' },
    },
    stationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'stations', key: 'id' },
    },
    travelDate: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM('create', 'cancel', 'rebook', 'waitlist', 'promote', 'board', 'modify', 'release'),
      allowNull: false,
    },
    previousStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    newStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    previousRouteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'routes', key: 'id' },
    },
    previousStationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'stations', key: 'id' },
    },
    previousTravelDate: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    newRouteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'routes', key: 'id' },
    },
    newStationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'stations', key: 'id' },
    },
    newTravelDate: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    operatorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    channel: {
      type: DataTypes.ENUM('web', 'mobile', 'api', 'system'),
      allowNull: false,
      defaultValue: 'web',
    },
    isReadonly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'BookingAuditLog',
    tableName: 'booking_audit_logs',
    timestamps: true,
  }
);

export default BookingAuditLog;
