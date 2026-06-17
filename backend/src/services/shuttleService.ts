import { Op, Transaction } from 'sequelize';
import dayjs from 'dayjs';
import {
  Route,
  Station,
  Booking,
  User,
  LeaveRecord,
  BoardingRecord,
  Schedule,
  ScheduleStationCapacity,
  ExtraRoute,
  WaitlistPromotion,
  BookingAuditLog,
} from '../models';
import {
  BookingStatus,
  DayType,
  PromotionReason,
  AuditAction,
  type Schedule as ISchedule,
  type OperationOverview,
  type TimelineEvent,
  type DriverBoardingInfo,
  type ExtraRouteType,
} from '../types';
import sequelize from '../config/database';

export class ShuttleService {
  private getDayType(date: string): DayType {
    const d = dayjs(date);
    const day = d.day();
    if (day === 0 || day === 6) return 'weekend';
    return 'weekday';
  }

  private async createAuditLog(
    data: {
      bookingId?: number;
      userId: number;
      routeId: number;
      stationId?: number;
      travelDate: string;
      action: AuditAction;
      previousStatus?: string;
      newStatus?: string;
      previousRouteId?: number;
      previousStationId?: number;
      previousTravelDate?: string;
      newRouteId?: number;
      newStationId?: number;
      newTravelDate?: string;
      reason?: string;
      operatorId?: number;
      channel?: string;
      isReadonly?: boolean;
      ipAddress?: string;
      userAgent?: string;
    },
    t?: Transaction
  ) {
    return BookingAuditLog.create(
      {
        ...data,
        channel: (data.channel as any) || 'web',
        isReadonly: data.isReadonly || false,
      },
      t ? { transaction: t } : undefined
    );
  }

  async getRoutes(includeStations = false) {
    const options: any = { where: { isActive: true }, order: [['id', 'ASC']] };
    if (includeStations) {
      options.include = [
        { model: Station, as: 'stations', order: [['sequence', 'ASC']] },
        { model: User, as: 'driver', attributes: ['id', 'name', 'employeeId'] },
      ];
    }
    return Route.findAll(options);
  }

  async getRouteById(id: number, includeStations = false) {
    const options: any = { where: { id } };
    if (includeStations) {
      options.include = [
        { model: Station, as: 'stations', order: [['sequence', 'ASC']] },
        { model: User, as: 'driver', attributes: ['id', 'name', 'employeeId'] },
      ];
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
      const dayTypes: DayType[] = ['weekday', 'weekend', 'holiday'];
      for (const dayType of dayTypes) {
        const schedule = await Schedule.create(
          {
            routeId: route.id,
            dayType,
            version: 1,
            isActive: true,
            createdBy: data.createdBy,
          },
          { transaction: t }
        );
        if (data.stations && data.stations.length > 0) {
          const capacities = data.stations.map((s: any, idx: number) => ({
            scheduleId: schedule.id,
            stationId: 0,
            capacity: s.capacity || 20,
          }));
          for (let i = 0; i < capacities.length; i++) {
            const station = await Station.findOne({
              where: { routeId: route.id, sequence: i + 1 },
              transaction: t,
            });
            if (station) {
              capacities[i].stationId = station.id;
            }
          }
          await ScheduleStationCapacity.bulkCreate(capacities, { transaction: t });
        }
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

  async getSchedulesByRouteId(routeId: number, includeCapacities = false) {
    const options: any = { where: { routeId, isActive: true }, order: [['version', 'DESC']] };
    if (includeCapacities) {
      options.include = [{ model: ScheduleStationCapacity, as: 'capacities', include: [{ model: Station, as: 'station' }] }];
    }
    return Schedule.findAll(options);
  }

  async createSchedule(routeId: number, dayType: DayType, data: any, createdBy?: number) {
    return sequelize.transaction(async (t) => {
      const lastSchedule = await Schedule.findOne({
        where: { routeId, dayType, isActive: true },
        order: [['version', 'DESC']],
        transaction: t,
      });
      const newVersion = lastSchedule ? lastSchedule.version + 1 : 1;
      const schedule = await Schedule.create(
        {
          routeId,
          dayType,
          effectiveDate: data.effectiveDate,
          expiryDate: data.expiryDate,
          version: newVersion,
          createdBy,
        },
        { transaction: t }
      );
      if (lastSchedule) {
        await lastSchedule.update({ isActive: false }, { transaction: t });
      }
      if (data.capacities && data.capacities.length > 0) {
        const capacities = data.capacities.map((c: any) => ({
          scheduleId: schedule.id,
          stationId: c.stationId,
          capacity: c.capacity,
        }));
        await ScheduleStationCapacity.bulkCreate(capacities, { transaction: t });
      }
      return schedule;
    });
  }

  async getScheduleForDate(routeId: number, travelDate: string) {
    const dayType = this.getDayType(travelDate);
    const schedule = await Schedule.findOne({
      where: {
        routeId,
        dayType,
        isActive: true,
        [Op.or]: [
          { effectiveDate: { [Op.is]: null } },
          { effectiveDate: { [Op.lte]: travelDate } },
        ],
        [Op.or]: [
          { expiryDate: { [Op.is]: null } },
          { expiryDate: { [Op.gte]: travelDate } },
        ],
      },
      include: [{ model: ScheduleStationCapacity, as: 'capacities' }],
      order: [['version', 'DESC']],
    });
    return schedule;
  }

  async getStationCapacity(stationId: number, travelDate: string, routeId?: number) {
    const station = await Station.findByPk(stationId);
    if (!station) throw new Error('站点不存在');

    let capacity = station.capacity;

    if (routeId) {
      const schedule = await this.getScheduleForDate(routeId, travelDate);
      if (schedule && schedule.capacities) {
        const scheduleCap = schedule.capacities.find((c) => c.stationId === stationId);
        if (scheduleCap) {
          capacity = scheduleCap.capacity;
        }
      }
    }

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
      capacity,
      confirmed: confirmedCount,
      waitlist: waitlistCount,
      available: Math.max(0, capacity - confirmedCount),
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

  private async promoteFirstWaitlist(
    stationId: number,
    travelDate: string,
    reason: PromotionReason,
    releasedByUserId?: number,
    promotedFromBookingId?: number,
    t?: Transaction
  ) {
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
      const previousPosition = firstWaitlist.waitlistPosition;
      await firstWaitlist.update(
        {
          status: BookingStatus.CONFIRMED,
          waitlistPosition: undefined,
          isWaitlistPromoted: true,
          promotedAt: new Date(),
          promotedReason: reason,
        } as any,
        { transaction: t }
      );

      await WaitlistPromotion.create(
        {
          bookingId: firstWaitlist.id,
          userId: firstWaitlist.userId,
          routeId: firstWaitlist.routeId,
          stationId: firstWaitlist.stationId,
          travelDate: firstWaitlist.travelDate,
          previousStatus: BookingStatus.WAITLIST,
          previousWaitlistPosition: previousPosition,
          promotedFromBookingId,
          reason,
          releasedByUserId,
          promotedAt: new Date(),
        },
        { transaction: t }
      );

      await this.createAuditLog(
        {
          bookingId: firstWaitlist.id,
          userId: firstWaitlist.userId,
          routeId: firstWaitlist.routeId,
          stationId: firstWaitlist.stationId,
          travelDate: firstWaitlist.travelDate,
          action: 'promote',
          previousStatus: BookingStatus.WAITLIST,
          newStatus: BookingStatus.CONFIRMED,
          reason: `候补转正: ${reason}`,
          operatorId: releasedByUserId,
          isReadonly: false,
        },
        t
      );

      return firstWaitlist;
    }
    return null;
  }

  async createBooking(userId: number, routeId: number, stationId: number, travelDate: string, extraRouteId?: number) {
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

      const capInfo = await this.getStationCapacity(stationId, travelDate, routeId);

      let status: BookingStatus;
      let waitlistPosition: number | undefined;

      if (capInfo.available > 0) {
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
          extraRouteId,
        },
        { transaction: t }
      );

      await this.createAuditLog(
        {
          bookingId: booking.id,
          userId,
          routeId,
          stationId,
          travelDate,
          action: status === BookingStatus.WAITLIST ? 'waitlist' : 'create',
          newStatus: status,
          isReadonly: false,
        },
        t
      );

      return booking;
    });
  }

  async cancelBooking(bookingId: number, userId: number, reason?: string) {
    return sequelize.transaction(async (t) => {
      const booking = await Booking.findByPk(bookingId, { transaction: t });
      if (!booking) throw new Error('预约不存在');
      if (booking.userId !== userId) throw new Error('无权取消他人预约');

      const route = await Route.findByPk(booking.routeId, { transaction: t });
      if (!route) throw new Error('线路不存在');

      const isDeparted = this.isAfterDeparture(route, booking.travelDate);
      if (isDeparted) {
        await this.createAuditLog(
          {
            bookingId: booking.id,
            userId: booking.userId,
            routeId: booking.routeId,
            stationId: booking.stationId,
            travelDate: booking.travelDate,
            action: 'cancel',
            previousStatus: booking.status,
            newStatus: BookingStatus.CANCELLED,
            reason: reason || '发车后取消申请',
            operatorId: userId,
            isReadonly: true,
          },
          t
        );
        throw new Error('车辆已发车，不能取消预约');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new Error('预约已取消');
      }

      const stationId = booking.stationId;
      const travelDate = booking.travelDate;
      const wasConfirmed = booking.status === BookingStatus.CONFIRMED;
      const previousStatus = booking.status;

      await booking.update(
        { status: BookingStatus.CANCELLED, cancelledAt: new Date(), waitlistPosition: undefined } as any,
        { transaction: t }
      );

      await this.createAuditLog(
        {
          bookingId: booking.id,
          userId: booking.userId,
          routeId: booking.routeId,
          stationId: booking.stationId,
          travelDate: booking.travelDate,
          action: 'cancel',
          previousStatus,
          newStatus: BookingStatus.CANCELLED,
          reason,
          operatorId: userId,
          isReadonly: false,
        },
        t
      );

      if (wasConfirmed) {
        await this.promoteFirstWaitlist(stationId, travelDate, 'cancel', userId, booking.id, t);
        await this.recalculateWaitlist(stationId, travelDate, t);
      } else {
        await this.recalculateWaitlist(stationId, travelDate, t);
      }

      return booking;
    });
  }

  async convertToWaitlist(bookingId: number, userId: number, reason: string) {
    return sequelize.transaction(async (t) => {
      const booking = await Booking.findByPk(bookingId, { transaction: t });
      if (!booking) throw new Error('预约不存在');
      if (booking.userId !== userId) throw new Error('无权操作他人预约');

      const route = await Route.findByPk(booking.routeId, { transaction: t });
      if (!route) throw new Error('线路不存在');

      if (this.isAfterDeparture(route, booking.travelDate)) {
        await this.createAuditLog(
          {
            bookingId: booking.id,
            userId: booking.userId,
            routeId: booking.routeId,
            stationId: booking.stationId,
            travelDate: booking.travelDate,
            action: 'modify',
            previousStatus: booking.status,
            newStatus: BookingStatus.WAITLIST,
            reason: `发车后申请转候补: ${reason}`,
            operatorId: userId,
            isReadonly: true,
          },
          t
        );
        throw new Error('车辆已发车，改签仅支持只读审计记录');
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new Error('只有已确认的预约才能转候补');
      }

      const previousStatus = booking.status;
      const waitlistCount = await Booking.count({
        where: { stationId: booking.stationId, travelDate: booking.travelDate, status: BookingStatus.WAITLIST },
        transaction: t,
      });

      await booking.update(
        {
          status: BookingStatus.WAITLIST,
          waitlistPosition: waitlistCount + 1,
        } as any,
        { transaction: t }
      );

      await this.createAuditLog(
        {
          bookingId: booking.id,
          userId: booking.userId,
          routeId: booking.routeId,
          stationId: booking.stationId,
          travelDate: booking.travelDate,
          action: 'waitlist',
          previousStatus,
          newStatus: BookingStatus.WAITLIST,
          reason,
          operatorId: userId,
          isReadonly: false,
        },
        t
      );

      await this.promoteFirstWaitlist(booking.stationId, booking.travelDate, 'rebook', userId, booking.id, t);

      return booking;
    });
  }

  async rebookBooking(
    bookingId: number,
    userId: number,
    newRouteId: number,
    newStationId: number,
    newTravelDate: string,
    reason: string
  ) {
    return sequelize.transaction(async (t) => {
      const oldBooking = await Booking.findByPk(bookingId, { transaction: t });
      if (!oldBooking) throw new Error('原预约不存在');
      if (oldBooking.userId !== userId) throw new Error('无权操作他人预约');

      const oldRoute = await Route.findByPk(oldBooking.routeId, { transaction: t });
      if (!oldRoute) throw new Error('原线路不存在');

      const newRoute = await Route.findByPk(newRouteId, { transaction: t });
      if (!newRoute || !newRoute.isActive) throw new Error('新线路不存在或已停用');

      const newStation = await Station.findByPk(newStationId, { transaction: t });
      if (!newStation || newStation.routeId !== newRouteId) throw new Error('新站点不存在');

      const oldDeparted = this.isAfterDeparture(oldRoute, oldBooking.travelDate);
      const newDeparted = this.isAfterDeparture(newRoute, newTravelDate);

      if (oldDeparted || newDeparted) {
        await this.createAuditLog(
          {
            bookingId: oldBooking.id,
            userId: oldBooking.userId,
            routeId: oldBooking.routeId,
            stationId: oldBooking.stationId,
            travelDate: oldBooking.travelDate,
            action: 'rebook',
            previousStatus: oldBooking.status,
            previousRouteId: oldBooking.routeId,
            previousStationId: oldBooking.stationId,
            previousTravelDate: oldBooking.travelDate,
            newRouteId,
            newStationId,
            newTravelDate,
            reason: `发车后改签: ${reason}`,
            operatorId: userId,
            isReadonly: true,
          },
          t
        );
        throw new Error('车辆已发车，改签仅支持只读审计记录');
      }

      if (oldBooking.status !== BookingStatus.CONFIRMED && oldBooking.status !== BookingStatus.WAITLIST) {
        throw new Error('该预约状态不支持改签');
      }

      const onLeave = await this.isUserOnLeave(userId, newTravelDate);
      if (onLeave) {
        throw new Error('您当日请假，不能预约班车');
      }

      const hasBooking = await this.hasExistingBooking(userId, newRouteId, newTravelDate);
      if (hasBooking) {
        throw new Error('您当日已预约该新线路');
      }

      const capInfo = await this.getStationCapacity(newStationId, newTravelDate, newRouteId);

      let newStatus: BookingStatus;
      let newWaitlistPosition: number | undefined;

      if (capInfo.available > 0) {
        newStatus = BookingStatus.CONFIRMED;
      } else {
        newStatus = BookingStatus.WAITLIST;
        const waitlistCount = await Booking.count({
          where: { newStationId, newTravelDate, status: BookingStatus.WAITLIST },
          transaction: t,
        });
        newWaitlistPosition = waitlistCount + 1;
      }

      const previousStatus = oldBooking.status;
      const wasConfirmed = previousStatus === BookingStatus.CONFIRMED;

      await oldBooking.update(
        { status: BookingStatus.CANCELLED, cancelledAt: new Date(), waitlistPosition: undefined } as any,
        { transaction: t }
      );

      const newBooking = await Booking.create(
        {
          userId,
          routeId: newRouteId,
          stationId: newStationId,
          travelDate: newTravelDate,
          status: newStatus,
          waitlistPosition: newWaitlistPosition,
          originalBookingId: oldBooking.id,
        },
        { transaction: t }
      );

      await this.createAuditLog(
        {
          bookingId: oldBooking.id,
          userId,
          routeId: oldBooking.routeId,
          stationId: oldBooking.stationId,
          travelDate: oldBooking.travelDate,
          action: 'rebook',
          previousStatus,
          newStatus: BookingStatus.CANCELLED,
          previousRouteId: oldBooking.routeId,
          previousStationId: oldBooking.stationId,
          previousTravelDate: oldBooking.travelDate,
          newRouteId,
          newStationId,
          newTravelDate,
          reason,
          operatorId: userId,
          isReadonly: false,
        },
        t
      );

      await this.createAuditLog(
        {
          bookingId: newBooking.id,
          userId,
          routeId: newRouteId,
          stationId: newStationId,
          travelDate: newTravelDate,
          action: 'create',
          newStatus,
          reason: `改签自预约#${oldBooking.id}`,
          operatorId: userId,
          isReadonly: false,
        },
        t
      );

      if (wasConfirmed) {
        await this.promoteFirstWaitlist(
          oldBooking.stationId,
          oldBooking.travelDate,
          'rebook',
          userId,
          oldBooking.id,
          t
        );
        await this.recalculateWaitlist(oldBooking.stationId, oldBooking.travelDate, t);
      } else {
        await this.recalculateWaitlist(oldBooking.stationId, oldBooking.travelDate, t);
      }

      return { oldBooking, newBooking };
    });
  }

  async processLeaveReleases(travelDate: string) {
    return sequelize.transaction(async (t) => {
      const leaveRecords = await LeaveRecord.findAll({
        where: { leaveDate: travelDate },
        include: [{ model: User, as: 'user' }],
        transaction: t,
      });

      const results = [];

      for (const leave of leaveRecords) {
        const bookings = await Booking.findAll({
          where: {
            userId: leave.userId,
            travelDate,
            status: { [Op.in]: [BookingStatus.CONFIRMED, BookingStatus.WAITLIST] },
          },
          include: [{ model: Route, as: 'route' }],
          transaction: t,
        });

        for (const booking of bookings) {
          const route = booking.route;
          if (!route) continue;

          if (this.isAfterDeparture(route, travelDate)) {
            await this.createAuditLog(
              {
                bookingId: booking.id,
                userId: booking.userId,
                routeId: booking.routeId,
                stationId: booking.stationId,
                travelDate,
                action: 'release',
                previousStatus: booking.status,
                newStatus: BookingStatus.RELEASED,
                reason: `请假自动释放: ${leave.leaveType}`,
                isReadonly: true,
              },
              t
            );
            continue;
          }

          const previousStatus = booking.status;
          const wasConfirmed = previousStatus === BookingStatus.CONFIRMED;
          const stationId = booking.stationId;

          await booking.update(
            {
              status: BookingStatus.RELEASED,
              releasedAt: new Date(),
              releaseReason: `请假: ${leave.leaveType}`,
              waitlistPosition: undefined,
            } as any,
            { transaction: t }
          );

          await this.createAuditLog(
            {
              bookingId: booking.id,
              userId: booking.userId,
              routeId: booking.routeId,
              stationId,
              travelDate,
              action: 'release',
              previousStatus,
              newStatus: BookingStatus.RELEASED,
              reason: `请假自动释放: ${leave.leaveType}`,
              isReadonly: false,
            },
            t
          );

          if (wasConfirmed) {
            await this.promoteFirstWaitlist(stationId, travelDate, 'leave', leave.userId, booking.id, t);
          }
          results.push({ bookingId: booking.id, userId: leave.userId, userName: leave.user?.name });
        }
      }

      return results;
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
          isWaitlistPromoted: booking.isWaitlistPromoted,
        },
        { transaction: t }
      );

      await this.createAuditLog(
        {
          bookingId: booking.id,
          userId: booking.userId,
          routeId: booking.routeId,
          stationId: booking.stationId,
          travelDate: booking.travelDate,
          action: 'board',
          previousStatus: BookingStatus.CONFIRMED,
          newStatus: BookingStatus.BOARDED,
          operatorId: driverId,
          isReadonly: false,
        },
        t
      );

      return booking;
    });
  }

  async getDriverBoardingList(routeId: number, travelDate: string) {
    const bookings = await Booking.findAll({
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

    const promotions = await WaitlistPromotion.findAll({
      where: { routeId, travelDate },
      include: [{ model: User, as: 'user' }, { model: Booking, as: 'promotedFromBooking' }],
    });

    const releases = await Booking.findAll({
      where: {
        routeId,
        travelDate,
        status: BookingStatus.RELEASED,
      },
      include: [
        { model: User, as: 'user' },
        { model: Station, as: 'station' },
      ],
    });

    const result: DriverBoardingInfo[] = [];
    let boardingSequence = 1;

    for (const booking of bookings) {
      const promotion = promotions.find((p) => p.bookingId === booking.id);
      const release = releases.find((r) => r.id === booking.id);

      result.push({
        bookingId: booking.id,
        userId: booking.userId,
        userName: booking.user?.name || '-',
        employeeId: booking.user?.employeeId || '-',
        stationId: booking.stationId,
        stationName: booking.station?.name || '-',
        status: booking.status,
        isWaitlistPromoted: !!booking.isWaitlistPromoted,
        promotedReason: booking.promotedReason as any,
        releasedInfo: release
          ? {
              releasedAt: release.releasedAt!,
              reason: release.releaseReason || '',
            }
          : undefined,
        boardingSequence: booking.status === BookingStatus.BOARDED ? boardingSequence++ : undefined,
      });
    }

    return result;
  }

  async getOperationOverview(routeId: number, travelDate: string) {
    const route = await Route.findByPk(routeId, { include: [{ model: Station, as: 'stations', order: [['sequence', 'ASC'] }] });
    if (!route) throw new Error('线路不存在');

    const schedule = await this.getScheduleForDate(routeId, travelDate);

    const bookings = await Booking.findAll({
      where: { routeId, travelDate },
      include: [
        { model: User, as: 'user' },
        { model: Station, as: 'station' },
      ],
    });

    const promotions = await WaitlistPromotion.findAll({
      where: { routeId, travelDate },
      include: [
        { model: User, as: 'user' },
        { model: Booking, as: 'promotedFromBooking', include: [{ model: User, as: 'user' }] },
      ],
    });

    const stations = route.stations || [];
    const stationOccupancies = [];
    let totalCapacity = 0;
    let totalConfirmed = 0;
    let totalWaitlist = 0;
    let totalBoarded = 0;
    let totalReleased = 0;

    for (const station of stations) {
      let capacity = station.capacity;
      if (schedule && schedule.capacities) {
        const schedCap = schedule.capacities.find((c) => c.stationId === station.id);
        if (schedCap) capacity = schedCap.capacity;
      }

      const stationBookings = bookings.filter((b) => b.stationId === station.id);
      const confirmed = stationBookings.filter((b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.BOARDED).length;
      const waitlist = stationBookings.filter((b) => b.status === BookingStatus.WAITLIST).length;
      const boarded = stationBookings.filter((b) => b.status === BookingStatus.BOARDED).length;
      const released = stationBookings.filter((b) => b.status === BookingStatus.RELEASED).length;

      totalCapacity += capacity;
      totalConfirmed += confirmed;
      totalWaitlist += waitlist;
      totalBoarded += boarded;
      totalReleased += released;

      stationOccupancies.push({
        stationId: station.id,
        stationName: station.name,
        sequence: station.sequence,
        capacity,
        confirmed,
        waitlist,
        boarded,
        available: Math.max(0, capacity - confirmed),
      });
    }

    const lateReleases = [];
    const departureTime = dayjs(`${travelDate} ${route.departureTime}`);

    for (const booking of bookings) {
      if (booking.status === BookingStatus.RELEASED && booking.releasedAt) {
        const releasedAt = dayjs(booking.releasedAt);
        const minutesBefore = departureTime.diff(releasedAt, 'minute');
        if (minutesBefore < 120) {
          lateReleases.push({
            bookingId: booking.id,
            userId: booking.userId,
            userName: booking.user?.name || '-',
            stationName: booking.station?.name || '-',
            releasedAt: booking.releasedAt,
            reason: booking.releaseReason || '',
            minutesBeforeDeparture: minutesBefore,
          });
        }
      }
    }

    const promotionInfos = promotions.map((p) => ({
      bookingId: p.bookingId,
      userId: p.userId,
      userName: p.user?.name || '-',
      stationName: bookings.find((b) => b.id === p.bookingId)?.station?.name || '-',
      previousPosition: p.previousWaitlistPosition || 0,
      promotedAt: p.promotedAt,
      reason: p.reason,
      releasedByName: p.promotedFromBooking?.user?.name,
    }));

    const overview: OperationOverview = {
      routeId,
      routeName: route.name,
      travelDate,
      scheduleVersion: schedule?.version || 1,
      totalCapacity,
      totalConfirmed,
      totalWaitlist,
      totalBoarded,
      totalReleased,
      stations: stationOccupancies,
      lateReleases,
      promotions: promotionInfos,
    };

    return overview;
  }

  async getTimeline(routeId: number, travelDate: string) {
    const events: TimelineEvent[] = [];

    const bookings = await Booking.findAll({
      where: { routeId, travelDate },
      include: [{ model: User, as: 'user' }],
    });

    const auditLogs = await BookingAuditLog.findAll({
      where: { routeId, travelDate },
      include: [{ model: User, as: 'user' }],
      order: [['createdAt', 'ASC']],
    });

    const promotions = await WaitlistPromotion.findAll({
      where: { routeId, travelDate },
      include: [{ model: User, as: 'user' }],
    });

    for (const log of auditLogs) {
      events.push({
        id: `audit-${log.id}`,
        timestamp: log.createdAt,
        type: log.action as any,
        userId: log.userId,
        userName: log.user?.name,
        description: this.getAuditDescription(log),
        details: log,
      });
    }

    for (const promotion of promotions) {
      events.push({
        id: `promo-${promotion.id}`,
        timestamp: promotion.promotedAt,
        type: 'promote',
        userId: promotion.userId,
        userName: promotion.user?.name,
        description: `${promotion.user?.name} 候补转正（原因：${this.getPromotionReasonText(promotion.reason)}`,
        details: promotion,
      });
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private getAuditDescription(log: any): string {
    const actionMap: Record<string, string> = {
      create: '预约成功',
      cancel: '取消预约',
      rebook: '改签',
      waitlist: '加入候补',
      promote: '候补转正',
      board: '已上车',
      modify: '修改预约',
      release: '释放名额',
    };
    return `${log.user?.name || '用户'} ${actionMap[log.action] || log.action}${log.reason ? ` - ${log.reason}` : ''}${log.isReadonly ? ' [只读审计]' : ''}';
  }

  private getPromotionReasonText(reason: string): string {
    const map: Record<string, string> = {
      cancel: '用户取消',
      leave: '请假释放',
      no_show: '未到释放',
      rebook: '改签释放',
      extra_route: '补班释放',
    };
    return map[reason] || reason;
  }

  async createExtraRoute(
    routeId: number,
    type: ExtraRouteType,
    data: any,
    createdBy: number
  ) {
    return sequelize.transaction(async (t) => {
      const extraRoute = await ExtraRoute.create(
        {
          routeId,
          originalRouteId: data.originalRouteId,
          type,
          travelDate: data.travelDate,
          departureTime: data.departureTime,
          returnTime: data.returnTime,
          vehiclePlate: data.vehiclePlate,
          driverId: data.driverId,
          reason: data.reason,
          status: 'active',
          createdBy,
        },
        { transaction: t }
      );

      if (data.stations && data.stations.length > 0) {
        const stations = data.stations.map((s: any, idx: number) => ({
          ...s,
          routeId: routeId,
          sequence: idx + 1,
        }));
        await Station.bulkCreate(stations, { transaction: t });
      }

      return extraRoute;
    });
  }

  async getExtraRoutes(travelDate?: string, routeId?: number, type?: ExtraRouteType) {
    const where: any = {};
    if (travelDate) where.travelDate = travelDate;
    if (routeId) where.routeId = routeId;
    if (type) where.type = type;
    return ExtraRoute.findAll({
      where,
      include: [
        { model: Route, as: 'route' },
        { model: Route, as: 'originalRoute' },
        { model: User, as: 'driver' },
      ],
      order: [['travelDate', 'DESC']],
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
        { model: ExtraRoute, as: 'extraRoute' },
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
        { model: ExtraRoute, as: 'extraRoute' },
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
        { model: ExtraRoute, as: 'extraRoute' },
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

  async getAuditLogs(bookingId?: number, userId?: number, routeId?: number, travelDate?: string) {
    const where: any = {};
    if (bookingId) where.bookingId = bookingId;
    if (userId) where.userId = userId;
    if (routeId) where.routeId = routeId;
    if (travelDate) where.travelDate = travelDate;
    return BookingAuditLog.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'employeeId'] },
        { model: User, as: 'operator', attributes: ['id', 'name', 'employeeId'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getUserById(id: number) {
    return User.findByPk(id);
  }

  async getWaitlistPromotions(routeId?: number, travelDate?: string, userId?: number) {
    const where: any = {};
    if (routeId) where.routeId = routeId;
    if (travelDate) where.travelDate = travelDate;
    if (userId) where.userId = userId;
    return WaitlistPromotion.findAll({
      where,
      include: [
        { model: User, as: 'user' },
        { model: Booking, as: 'booking' },
      ],
      order: [['promotedAt', 'DESC']],
    });
  }
}

export default new ShuttleService();
