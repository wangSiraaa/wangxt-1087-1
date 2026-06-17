import { Op, Transaction } from 'sequelize';
import dayjs from 'dayjs';
import { Route, Station, Booking, User, LeaveRecord, BoardingRecord } from '../models';
import { BookingStatus } from '../types';
import sequelize from '../config/database';

export class ShuttleService {
  async getRoutes(includeStations = false) {
    const options: any = { where: { isActive: true }, order: [['id', 'ASC']] };
    if (includeStations) {
      options.include = [{ model: Station, as: 'stations', order: [['sequence', 'ASC']] }];
    }
    return Route.findAll(options);
  }

  async getRouteById(id: number, includeStations = false) {
    const options: any = { where: { id } };
    if (includeStations) {
      options.include = [{ model: Station, as: 'stations', order: [['sequence', 'ASC']] }];
    }
    return Route.findByPk(id, options);
  }

  async createRoute(data: any) {
    return sequelize.transaction(async (t) => {
      const route = await Route.create(data, { transaction: t });
      if (data.stations && data.stations.length > 0) {
        const stations = data.stations.map((s: any, idx: number) => ({
          ...s,
          routeId: route.id,
          sequence: idx + 1,
        }));
        await Station.bulkCreate(stations, { transaction: t });
      }
      return route;
    });
  }

  async updateRoute(id: number, data: any) {
    return sequelize.transaction(async (t) => {
      const route = await Route.findByPk(id, { transaction: t });
      if (!route) throw new Error('线路不存在');
      await route.update(data, { transaction: t });
      if (data.stations) {
        await Station.destroy({ where: { routeId: id }, transaction: t });
        const stations = data.stations.map((s: any, idx: number) => ({
          ...s,
          routeId: id,
          sequence: idx + 1,
        }));
        await Station.bulkCreate(stations, { transaction: t });
      }
      return route;
    });
  }

  async deleteRoute(id: number) {
    const route = await Route.findByPk(id);
    if (!route) throw new Error('线路不存在');
    await route.update({ isActive: false });
    return true;
  }

  async getStationsByRouteId(routeId: number) {
    return Station.findAll({ where: { routeId }, order: [['sequence', 'ASC']] });
  }

  async createStation(data: any) {
    return Station.create(data);
  }

  async updateStation(id: number, data: any) {
    const station = await Station.findByPk(id);
    if (!station) throw new Error('站点不存在');
    return station.update(data);
  }

  async deleteStation(id: number) {
    const station = await Station.findByPk(id);
    if (!station) throw new Error('站点不存在');
    return station.destroy();
  }

  async getStationCapacity(stationId: number, travelDate: string) {
    const station = await Station.findByPk(stationId);
    if (!station) throw new Error('站点不存在');

    const confirmedCount = await Booking.count({
      where: {
        stationId,
        travelDate,
        status: { [Op.in]: [BookingStatus.CONFIRMED, BookingStatus.BOARDED] },
      },
    });

    const waitlistCount = await Booking.count({
      where: {
        stationId,
        travelDate,
        status: BookingStatus.WAITLIST,
      },
    });

    return {
      capacity: station.capacity,
      confirmed: confirmedCount,
      waitlist: waitlistCount,
      available: Math.max(0, station.capacity - confirmedCount),
    };
  }

  async isUserOnLeave(userId: number, date: string) {
    const count = await LeaveRecord.count({
      where: { userId, leaveDate: date },
    });
    return count > 0;
  }

  async hasExistingBooking(userId: number, routeId: number, travelDate: string) {
    const count = await Booking.count({
      where: {
        userId,
        routeId,
        travelDate,
        status: { [Op.in]: [BookingStatus.CONFIRMED, BookingStatus.WAITLIST, BookingStatus.BOARDED] },
      },
    });
    return count > 0;
  }

  private isAfterDeparture(route: any, travelDate: string) {
    const now = dayjs();
    const departureDateTime = dayjs(`${travelDate} ${route.departureTime}`);
    return now.isAfter(departureDateTime);
  }

  private async recalculateWaitlist(stationId: number, travelDate: string, t: Transaction) {
    const waitlistBookings = await Booking.findAll({
      where: {
        stationId,
        travelDate,
        status: BookingStatus.WAITLIST,
      },
      order: [['createdAt', 'ASC']],
      transaction: t,
    });

    for (let i = 0; i < waitlistBookings.length; i++) {
      await waitlistBookings[i].update({ waitlistPosition: i + 1 }, { transaction: t });
    }
  }

  async createBooking(userId: number, routeId: number, stationId: number, travelDate: string) {
    return sequelize.transaction(async (t) => {
      const route = await Route.findByPk(routeId, { transaction: t });
      if (!route || !route.isActive) throw new Error('线路不存在或已停用');

      const station = await Station.findByPk(stationId, { transaction: t });
      if (!station || station.routeId !== routeId) throw new Error('站点不存在');

      if (this.isAfterDeparture(route, travelDate)) {
        throw new Error('车辆已发车，不能预约');
      }

      const onLeave = await this.isUserOnLeave(userId, travelDate);
      if (onLeave) {
        throw new Error('您当日请假，不能预约班车');
      }

      const hasBooking = await this.hasExistingBooking(userId, routeId, travelDate);
      if (hasBooking) {
        throw new Error('您当日已预约该线路');
      }

      const capacity = station.capacity;
      const confirmedCount = await Booking.count({
        where: {
          stationId,
          travelDate,
          status: { [Op.in]: [BookingStatus.CONFIRMED, BookingStatus.BOARDED] },
        },
        transaction: t,
      });

      let status: BookingStatus;
      let waitlistPosition: number | undefined;

      if (confirmedCount < capacity) {
        status = BookingStatus.CONFIRMED;
      } else {
        status = BookingStatus.WAITLIST;
        const waitlistCount = await Booking.count({
          where: { stationId, travelDate, status: BookingStatus.WAITLIST },
          transaction: t,
        });
        waitlistPosition = waitlistCount + 1;
      }

      const booking = await Booking.create(
        {
          userId,
          routeId,
          stationId,
          travelDate,
          status,
          waitlistPosition,
        },
        { transaction: t }
      );

      return booking;
    });
  }

  async cancelBooking(bookingId: number, userId: number) {
    return sequelize.transaction(async (t) => {
      const booking = await Booking.findByPk(bookingId, { transaction: t });
      if (!booking) throw new Error('预约不存在');
      if (booking.userId !== userId) throw new Error('无权取消他人预约');

      const route = await Route.findByPk(booking.routeId, { transaction: t });
      if (!route) throw new Error('线路不存在');

      if (this.isAfterDeparture(route, booking.travelDate)) {
        throw new Error('车辆已发车，不能取消预约');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new Error('预约已取消');
      }

      const stationId = booking.stationId;
      const travelDate = booking.travelDate;
      const wasConfirmed = booking.status === BookingStatus.CONFIRMED;

      await booking.update(
        { status: BookingStatus.CANCELLED, cancelledAt: new Date(), waitlistPosition: undefined } as any,
        { transaction: t }
      );

      if (wasConfirmed) {
        const firstWaitlist = await Booking.findOne({
          where: {
            stationId,
            travelDate,
            status: BookingStatus.WAITLIST,
          },
          order: [['createdAt', 'ASC']],
          transaction: t,
        });

        if (firstWaitlist) {
          await firstWaitlist.update(
            { status: BookingStatus.CONFIRMED, waitlistPosition: undefined } as any,
            { transaction: t }
          );
        }

        await this.recalculateWaitlist(stationId, travelDate, t);
      } else {
        await this.recalculateWaitlist(stationId, travelDate, t);
      }

      return booking;
    });
  }

  async confirmBoarding(bookingId: number, driverId: number) {
    return sequelize.transaction(async (t) => {
      const booking = await Booking.findByPk(bookingId, { transaction: t });
      if (!booking) throw new Error('预约不存在');
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new Error('只有已确认的预约才能上车');
      }

      await booking.update(
        { status: BookingStatus.BOARDED, boardedAt: new Date() },
        { transaction: t }
      );

      await BoardingRecord.create(
        {
          bookingId: booking.id,
          userId: booking.userId,
          routeId: booking.routeId,
          stationId: booking.stationId,
          travelDate: booking.travelDate,
          boardedAt: new Date(),
          driverId,
        },
        { transaction: t }
      );

      return booking;
    });
  }

  async getBookingsByUser(userId: number, date?: string) {
    const where: any = { userId };
    if (date) where.travelDate = date;
    return Booking.findAll({
      where,
      include: [
        { model: Route, as: 'route' },
        { model: Station, as: 'station' },
      ],
      order: [['travelDate', 'DESC'], ['createdAt', 'DESC']],
    });
  }

  async getBookingsByRouteAndDate(routeId: number, travelDate: string) {
    return Booking.findAll({
      where: { routeId, travelDate },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'employeeId', 'phone'] },
        { model: Station, as: 'station' },
      ],
      order: [
        ['status', 'ASC'],
        ['stationId', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
  }

  async getBookingById(id: number) {
    return Booking.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'employeeId'] },
        { model: Route, as: 'route' },
        { model: Station, as: 'station' },
      ],
    });
  }

  async getUsers(role?: string) {
    const where: any = {};
    if (role) where.role = role;
    return User.findAll({ where, order: [['id', 'ASC']] });
  }

  async createUser(data: any) {
    return User.create(data);
  }

  async getLeaveRecords(userId?: number, date?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (date) where.leaveDate = date;
    return LeaveRecord.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'employeeId'] }],
      order: [['leaveDate', 'DESC']],
    });
  }

  async createLeaveRecord(userId: number, data: any) {
    return LeaveRecord.create({ ...data, userId });
  }

  async getBoardingRecords(routeId?: number, travelDate?: string, stationId?: number) {
    const where: any = {};
    if (routeId) where.routeId = routeId;
    if (travelDate) where.travelDate = travelDate;
    if (stationId) where.stationId = stationId;
    return BoardingRecord.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'employeeId'] },
        { model: Route, as: 'route' },
        { model: Station, as: 'station' },
      ],
      order: [['boardedAt', 'DESC']],
    });
  }

  async getUserById(id: number) {
    return User.findByPk(id);
  }
}

export default new ShuttleService();
