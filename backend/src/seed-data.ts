import { User, Route, Station, LeaveRecord } from './models';
import { Role } from './types';
import dayjs from 'dayjs';

export async function seedData() {
  const admin = await User.create({
    name: '张行政',
    employeeId: 'ADMIN001',
    role: Role.ADMIN,
    phone: '13800000001',
  });

  const driver1 = await User.create({
    name: '李司机',
    employeeId: 'DRIVER001',
    role: Role.DRIVER,
    phone: '13800000002',
  });

  const driver2 = await User.create({
    name: '王司机',
    employeeId: 'DRIVER002',
    role: Role.DRIVER,
    phone: '13800000003',
  });

  const employees = [];
  const employeeNames = ['赵员工', '钱员工', '孙员工', '周员工', '吴员工', '郑员工', '王员工', '冯员工'];
  for (let i = 0; i < employeeNames.length; i++) {
    const emp = await User.create({
      name: employeeNames[i],
      employeeId: `EMP${String(i + 1).padStart(3, '0')}`,
      role: Role.EMPLOYEE,
      phone: `13900000${String(i + 1).padStart(3, '0')}`,
    });
    employees.push(emp);
  }

  const route1 = await Route.create({
    name: '1号线-科技园方向',
    description: '从市区到科技园的上班线路',
    direction: 'up',
    departureTime: '07:30',
    returnTime: '18:00',
    vehiclePlate: '京A12345',
    driverId: driver1.id,
    isActive: true,
  });
  route1.driverId = driver1.id;
  await route1.save();

  const stations1 = [
    { name: '市中心站', sequence: 1, capacity: 30, arriveTime: '07:30', address: '市中心广场' },
    { name: '文化宫站', sequence: 2, capacity: 25, arriveTime: '07:40', address: '文化宫门口' },
    { name: '科技园北站', sequence: 3, capacity: 20, arriveTime: '08:00', address: '科技园北门' },
    { name: '科技园南站', sequence: 4, capacity: 15, arriveTime: '08:10', address: '科技园南门' },
  ];
  for (const s of stations1) {
    await Station.create({ ...s, routeId: route1.id });
  }

  const route2 = await Route.create({
    name: '2号线-高新区方向',
    description: '从市区到高新区的上班线路',
    direction: 'up',
    departureTime: '07:45',
    returnTime: '18:15',
    vehiclePlate: '京B67890',
    driverId: driver2.id,
    isActive: true,
  });
  route2.driverId = driver2.id;
  await route2.save();

  const stations2 = [
    { name: '火车站', sequence: 1, capacity: 35, arriveTime: '07:45', address: '火车站东广场' },
    { name: '市政府站', sequence: 2, capacity: 20, arriveTime: '07:55', address: '市政府北门' },
    { name: '高新区站', sequence: 3, capacity: 25, arriveTime: '08:15', address: '高新区管委会' },
    { name: '创业大厦站', sequence: 4, capacity: 20, arriveTime: '08:25', address: '创业大厦楼下' },
  ];
  for (const s of stations2) {
    await Station.create({ ...s, routeId: route2.id });
  }

  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  await LeaveRecord.create({
    userId: employees[2].id,
    leaveDate: tomorrow,
    leaveType: '年假',
    reason: '个人事务',
  });
}
