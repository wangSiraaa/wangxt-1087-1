import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface LeaveRecordAttributes {
  id: number;
  userId: number;
  leaveDate: string;
  leaveType: string;
  reason?: string;
}

interface LeaveRecordCreationAttributes extends Optional<LeaveRecordAttributes, 'id' | 'reason'> {}

class LeaveRecord extends Model<LeaveRecordAttributes, LeaveRecordCreationAttributes> implements LeaveRecordAttributes {
  public id!: number;
  public userId!: number;
  public leaveDate!: string;
  public leaveType!: string;
  public reason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LeaveRecord.init(
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
    leaveDate: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    leaveType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'LeaveRecord',
    tableName: 'leave_records',
    timestamps: true,
  }
);

export default LeaveRecord;
