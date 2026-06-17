import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type PromotionReason = 'cancel' | 'leave' | 'no_show' | 'rebook' | 'extra_route';

interface WaitlistPromotionAttributes {
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
}

interface WaitlistPromotionCreationAttributes extends Optional<WaitlistPromotionAttributes, 'id' | 'promotedAt'> {}

class WaitlistPromotion extends Model<WaitlistPromotionAttributes, WaitlistPromotionCreationAttributes> implements WaitlistPromotionAttributes {
  public id!: number;
  public bookingId!: number;
  public userId!: number;
  public routeId!: number;
  public stationId!: number;
  public travelDate!: string;
  public previousStatus!: string;
  public previousWaitlistPosition?: number;
  public promotedFromBookingId?: number;
  public reason!: PromotionReason;
  public releasedByUserId?: number;
  public promotedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WaitlistPromotion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      allowNull: false,
      references: { model: 'stations', key: 'id' },
    },
    travelDate: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    previousStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    previousWaitlistPosition: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    promotedFromBookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bookings', key: 'id' },
    },
    reason: {
      type: DataTypes.ENUM('cancel', 'leave', 'no_show', 'rebook', 'extra_route'),
      allowNull: false,
      defaultValue: 'cancel',
    },
    releasedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    promotedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'WaitlistPromotion',
    tableName: 'waitlist_promotions',
    timestamps: true,
  }
);

export default WaitlistPromotion;
