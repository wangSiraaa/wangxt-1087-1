import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ScheduleStationCapacityAttributes {
  id: number;
  scheduleId: number;
  stationId: number;
  capacity: number;
}

interface ScheduleStationCapacityCreationAttributes extends Optional<ScheduleStationCapacityAttributes, 'id'> {}

class ScheduleStationCapacity extends Model<ScheduleStationCapacityAttributes, ScheduleStationCapacityCreationAttributes> implements ScheduleStationCapacityAttributes {
  public id!: number;
  public scheduleId!: number;
  public stationId!: number;
  public capacity!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ScheduleStationCapacity.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    scheduleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'schedules', key: 'id' },
    },
    stationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'stations', key: 'id' },
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
    },
  },
  {
    sequelize,
    modelName: 'ScheduleStationCapacity',
    tableName: 'schedule_station_capacities',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['scheduleId', 'stationId'],
        name: 'schedule_capacity_unique_schedule_station',
      },
    ],
  }
);

export default ScheduleStationCapacity;
