import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { BookingStatus } from '../types';

interface BookingAttributes {
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
  promotedReason?: string;
  originalBookingId?: number;
  extraRouteId?: number;
  releaseReason?: string;
  releasedAt?: Date;
}

interface BookingCreationAttributes extends Optional<BookingAttributes, 'id' | 'waitlistPosition' | 'boardedAt' | 'cancelledAt'> {}

class Booking extends Model<BookingAttributes, BookingCreationAttributes> implements BookingAttributes {
  public id!: number;
  public userId!: number;
  public routeId!: number;
  public stationId!: number;
  public travelDate!: string;
  public status!: BookingStatus;
  public waitlistPosition?: number;
  public boardedAt?: Date;
  public cancelledAt?: Date;
  public isWaitlistPromoted?: boolean;
  public promotedAt?: Date;
  public promotedReason?: string;
  public originalBookingId?: number;
  public extraRouteId?: number;
  public releaseReason?: string;
  public releasedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Booking.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
      allowNull: false,
      references: { model: 'stations', key: 'id' },
    },
    travelDate: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BookingStatus)),
      allowNull: false,
      defaultValue: BookingStatus.CONFIRMED,
    },
    waitlistPosition: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    boardedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isWaitlistPromoted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    promotedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    promotedReason: {
      type: DataTypes.ENUM('cancel', 'leave', 'no_show', 'rebook', 'extra_route'),
      allowNull: true,
    },
    originalBookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bookings', key: 'id' },
    },
    extraRouteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'extra_routes', key: 'id' },
    },
    releaseReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    releasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Booking',
    tableName: 'bookings',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'routeId', 'travelDate'],
        name: 'booking_unique_user_route_date',
      },
    ],
  }
);

export default Booking;
