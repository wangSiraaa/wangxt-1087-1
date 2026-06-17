import { Router, Request, Response } from 'express';
import shuttleService from '../services/shuttleService';

const router = Router();

function assertBody(obj: any, ...fields: string[]) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null) {
      throw new Error(`缺少必填字段: ${f}`);
    }
  }
}

router.get('/routes', async (_req: Request, res: Response) => {
  try {
    const routes = await shuttleService.getRoutes(true);
    res.json({ success: true, data: routes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/routes/:id', async (req: Request, res: Response) => {
  try {
    const route = await shuttleService.getRouteById(Number(req.params.id), true);
    if (!route) return res.status(404).json({ success: false, message: '线路不存在' });
    res.json({ success: true, data: route });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/routes', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'name', 'departureTime');
    const route = await shuttleService.createRoute(req.body);
    const full = await shuttleService.getRouteById(route.id, true);
    res.status(201).json({ success: true, data: full });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/routes/:id', async (req: Request, res: Response) => {
  try {
    const route = await shuttleService.updateRoute(Number(req.params.id), req.body);
    const full = await shuttleService.getRouteById(route.id, true);
    res.json({ success: true, data: full });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/routes/:id', async (req: Request, res: Response) => {
  try {
    await shuttleService.deleteRoute(Number(req.params.id));
    res.json({ success: true, message: '线路已停用' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/routes/:routeId/stations', async (req: Request, res: Response) => {
  try {
    const stations = await shuttleService.getStationsByRouteId(Number(req.params.routeId));
    res.json({ success: true, data: stations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/routes/:routeId/schedules', async (req: Request, res: Response) => {
  try {
    const schedules = await shuttleService.getSchedulesByRouteId(Number(req.params.routeId), true);
    res.json({ success: true, data: schedules });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/routes/:routeId/schedules', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'dayType');
    const schedule = await shuttleService.createSchedule(
      Number(req.params.routeId),
      req.body.dayType,
      req.body,
      req.body.createdBy
    );
    res.status(201).json({ success: true, data: schedule });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/routes/:routeId/schedule-for-date', async (req: Request, res: Response) => {
  try {
    const travelDate = req.query.travelDate as string;
    if (!travelDate) return res.status(400).json({ success: false, message: '缺少 travelDate' });
    const schedule = await shuttleService.getScheduleForDate(Number(req.params.routeId), travelDate);
    res.json({ success: true, data: schedule });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/stations', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'routeId', 'name', 'capacity');
    const station = await shuttleService.createStation(req.body);
    res.status(201).json({ success: true, data: station });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/stations/:id', async (req: Request, res: Response) => {
  try {
    const station = await shuttleService.updateStation(Number(req.params.id), req.body);
    res.json({ success: true, data: station });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/stations/:id', async (req: Request, res: Response) => {
  try {
    await shuttleService.deleteStation(Number(req.params.id));
    res.json({ success: true, message: '站点已删除' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stations/:stationId/capacity', async (req: Request, res: Response) => {
  try {
    const travelDate = req.query.travelDate as string;
    const routeId = req.query.routeId ? Number(req.query.routeId) : undefined;
    if (!travelDate) return res.status(400).json({ success: false, message: '缺少 travelDate' });
    const cap = await shuttleService.getStationCapacity(Number(req.params.stationId), travelDate, routeId);
    res.json({ success: true, data: cap });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/extra-routes', async (req: Request, res: Response) => {
  try {
    const travelDate = req.query.travelDate as string | undefined;
    const routeId = req.query.routeId ? Number(req.query.routeId) : undefined;
    const type = req.query.type as any;
    const extraRoutes = await shuttleService.getExtraRoutes(travelDate, routeId, type);
    res.json({ success: true, data: extraRoutes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/extra-routes', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'routeId', 'type', 'travelDate', 'departureTime', 'createdBy');
    const extraRoute = await shuttleService.createExtraRoute(
      req.body.routeId,
      req.body.type,
      req.body,
      req.body.createdBy
    );
    res.status(201).json({ success: true, data: extraRoute });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/bookings', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'userId', 'routeId', 'stationId', 'travelDate');
    const booking = await shuttleService.createBooking(
      req.body.userId,
      req.body.routeId,
      req.body.stationId,
      req.body.travelDate,
      req.body.extraRouteId
    );
    res.status(201).json({ success: true, data: booking });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/bookings/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.userId);
    const reason = req.query.reason as string | undefined;
    if (!userId) return res.status(400).json({ success: false, message: '缺少 userId' });
    const booking = await shuttleService.cancelBooking(Number(req.params.id), userId, reason);
    res.json({ success: true, data: booking });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/bookings/:id/waitlist', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'userId', 'reason');
    const booking = await shuttleService.convertToWaitlist(
      Number(req.params.id),
      req.body.userId,
      req.body.reason
    );
    res.json({ success: true, data: booking });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/bookings/:id/rebook', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'userId', 'newRouteId', 'newStationId', 'newTravelDate', 'reason');
    const result = await shuttleService.rebookBooking(
      Number(req.params.id),
      req.body.userId,
      req.body.newRouteId,
      req.body.newStationId,
      req.body.newTravelDate,
      req.body.reason
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/bookings/process-leaves', async (req: Request, res: Response) => {
  try {
    const travelDate = req.body.travelDate || new Date().toISOString().slice(0, 10);
    const results = await shuttleService.processLeaveReleases(travelDate);
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/bookings/user/:userId', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const bookings = await shuttleService.getBookingsByUser(Number(req.params.userId), date);
    res.json({ success: true, data: bookings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/bookings/route/:routeId', async (req: Request, res: Response) => {
  try {
    const travelDate = req.query.travelDate as string;
    if (!travelDate) return res.status(400).json({ success: false, message: '缺少 travelDate' });
    const bookings = await shuttleService.getBookingsByRouteAndDate(Number(req.params.routeId), travelDate);
    res.json({ success: true, data: bookings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/bookings/route/:routeId/driver-boarding', async (req: Request, res: Response) => {
  try {
    const travelDate = req.query.travelDate as string;
    if (!travelDate) return res.status(400).json({ success: false, message: '缺少 travelDate' });
    const info = await shuttleService.getDriverBoardingList(Number(req.params.routeId), travelDate);
    res.json({ success: true, data: info });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/bookings/route/:routeId/overview', async (req: Request, res: Response) => {
  try {
    const travelDate = req.query.travelDate as string;
    if (!travelDate) return res.status(400).json({ success: false, message: '缺少 travelDate' });
    const overview = await shuttleService.getOperationOverview(Number(req.params.routeId), travelDate);
    res.json({ success: true, data: overview });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/bookings/route/:routeId/timeline', async (req: Request, res: Response) => {
  try {
    const travelDate = req.query.travelDate as string;
    if (!travelDate) return res.status(400).json({ success: false, message: '缺少 travelDate' });
    const timeline = await shuttleService.getTimeline(Number(req.params.routeId), travelDate);
    res.json({ success: true, data: timeline });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/bookings/:id', async (req: Request, res: Response) => {
  try {
    const booking = await shuttleService.getBookingById(Number(req.params.id));
    if (!booking) return res.status(404).json({ success: false, message: '预约不存在' });
    res.json({ success: true, data: booking });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/bookings/:id/board', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'driverId');
    const booking = await shuttleService.confirmBoarding(Number(req.params.id), req.body.driverId);
    res.json({ success: true, data: booking });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const users = await shuttleService.getUsers(role);
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await shuttleService.getUserById(Number(req.params.id));
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'name', 'employeeId', 'role');
    const user = await shuttleService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/leaves', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const date = req.query.date as string | undefined;
    const records = await shuttleService.getLeaveRecords(userId, date);
    res.json({ success: true, data: records });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/leaves', async (req: Request, res: Response) => {
  try {
    assertBody(req.body, 'userId', 'leaveDate', 'leaveType');
    const record = await shuttleService.createLeaveRecord(req.body.userId, req.body);
    res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/boarding-records', async (req: Request, res: Response) => {
  try {
    const routeId = req.query.routeId ? Number(req.query.routeId) : undefined;
    const travelDate = req.query.travelDate as string | undefined;
    const stationId = req.query.stationId ? Number(req.query.stationId) : undefined;
    const records = await shuttleService.getBoardingRecords(routeId, travelDate, stationId);
    res.json({ success: true, data: records });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const bookingId = req.query.bookingId ? Number(req.query.bookingId) : undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const routeId = req.query.routeId ? Number(req.query.routeId) : undefined;
    const travelDate = req.query.travelDate as string | undefined;
    const logs = await shuttleService.getAuditLogs(bookingId, userId, routeId, travelDate);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/waitlist-promotions', async (req: Request, res: Response) => {
  try {
    const routeId = req.query.routeId ? Number(req.query.routeId) : undefined;
    const travelDate = req.query.travelDate as string | undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const promotions = await shuttleService.getWaitlistPromotions(routeId, travelDate, userId);
    res.json({ success: true, data: promotions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
