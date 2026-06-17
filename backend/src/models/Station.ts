import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StationAttributes {
  id: number;
  routeId: number;
  name: string;
  sequence: number;
  capacity: number;
  arriveTime?: string;
  address?: string;
}

interface StationCreationAttributes extends Optional<StationAttributes, 'id'> {}

class Station extends Model<StationAttributes, StationCreationAttributes> implements StationAttributes {
  public id!: number;
  public routeId!: number;
  public name!: string;
  public sequence!: number;
  public capacity!: number;
  public arriveTime?: string;
  public address?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Station.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    routeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'routes',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
    },
    arriveTime: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Station',
    tableName: 'stations',
    timestamps: true,
  }
);

export default Station;
