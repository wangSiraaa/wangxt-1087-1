import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type ExtraRouteType = 'makeup' | 'reroute' | 'temporary';

interface ExtraRouteAttributes {
  id: number;
  routeId: number;
  originalRouteId?: number;
  type: ExtraRouteType;
  travelDate: string;
  departureTime: string;
  returnTime?: string;
  vehiclePlate?: string;
  driverId?: number;
  reason?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdBy?: number;
  approvedBy?: number;
}

interface ExtraRouteCreationAttributes extends Optional<ExtraRouteAttributes, 'id' | 'status'> {}

class ExtraRoute extends Model<ExtraRouteAttributes, ExtraRouteCreationAttributes> implements ExtraRouteAttributes {
  public id!: number;
  public routeId!: number;
  public originalRouteId?: number;
  public type!: ExtraRouteType;
  public travelDate!: string;
  public departureTime!: string;
  public returnTime?: string;
  public vehiclePlate?: string;
  public driverId?: number;
  public reason?: string;
  public status!: 'pending' | 'active' | 'completed' | 'cancelled';
  public createdBy?: number;
  public approvedBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExtraRoute.init(
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
    originalRouteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'routes', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('makeup', 'reroute', 'temporary'),
      allowNull: false,
      defaultValue: 'makeup',
    },
    travelDate: {
      type: DataTypes.STRING(10),
      allowNull: false,
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
      references: { model: 'users', key: 'id' },
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
  },
  {
    sequelize,
    modelName: 'ExtraRoute',
    tableName: 'extra_routes',
    timestamps: true,
  }
);

export default ExtraRoute;
