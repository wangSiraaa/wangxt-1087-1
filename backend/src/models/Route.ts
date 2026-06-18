import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface RouteAttributes {
  id: number;
  name: string;
  description?: string;
  direction: 'up' | 'down';
  departureTime: string;
  returnTime?: string;
  vehiclePlate?: string;
  driverId?: number;
  isActive: boolean;
}

interface RouteCreationAttributes extends Optional<RouteAttributes, 'id' | 'isActive'> {}

class Route extends Model<RouteAttributes, RouteCreationAttributes> implements RouteAttributes {
  public id!: number;
  public name!: string;
  public description?: string;
  public direction!: 'up' | 'down';
  public departureTime!: string;
  public returnTime?: string;
  public vehiclePlate?: string;
  public driverId?: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public driver?: any;
  public stations?: any[];
  public drivingRoutes?: any[];
}

Route.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    direction: {
      type: DataTypes.ENUM('up', 'down'),
      allowNull: false,
      defaultValue: 'up',
    },
    departureTime: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    returnTime: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    vehiclePlate: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Route',
    tableName: 'routes',
    timestamps: true,
  }
);

export default Route;
