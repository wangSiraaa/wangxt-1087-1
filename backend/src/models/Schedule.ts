import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type DayType = 'weekday' | 'weekend' | 'holiday';

interface ScheduleAttributes {
  id: number;
  routeId: number;
  dayType: DayType;
  effectiveDate?: string;
  expiryDate?: string;
  isActive: boolean;
  version: number;
  createdBy?: number;
}

interface ScheduleCreationAttributes extends Optional<ScheduleAttributes, 'id' | 'isActive' | 'version'> {}

class Schedule extends Model<ScheduleAttributes, ScheduleCreationAttributes> implements ScheduleAttributes {
  public id!: number;
  public routeId!: number;
  public dayType!: DayType;
  public effectiveDate?: string;
  public expiryDate?: string;
  public isActive!: boolean;
  public version!: number;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Schedule.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    routeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'routes', key: 'id' },
    },
    dayType: {
      type: DataTypes.ENUM('weekday', 'weekend', 'holiday'),
      allowNull: false,
      defaultValue: 'weekday',
    },
    effectiveDate: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
  },
  {
    sequelize,
    modelName: 'Schedule',
    tableName: 'schedules',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['routeId', 'dayType', 'version'],
        name: 'schedule_unique_route_daytype_version',
      },
    ],
  }
);

export default Schedule;
