import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BoardingRecordAttributes {
  id: number;
  bookingId: number;
  userId: number;
  routeId: number;
  stationId: number;
  travelDate: string;
  boardedAt: Date;
  driverId?: number;
  isWaitlistPromoted?: boolean;
}

interface BoardingRecordCreationAttributes extends Optional<BoardingRecordAttributes, 'id' | 'driverId'> {}

class BoardingRecord extends Model<BoardingRecordAttributes, BoardingRecordCreationAttributes> implements BoardingRecordAttributes {
  public id!: number;
  public bookingId!: number;
  public userId!: number;
  public routeId!: number;
  public stationId!: number;
  public travelDate!: string;
  public boardedAt!: Date;
  public driverId?: number;
  public isWaitlistPromoted?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BoardingRecord.init(
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
    boardedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    isWaitlistPromoted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'BoardingRecord',
    tableName: 'boarding_records',
    timestamps: true,
  }
);

export default BoardingRecord;
