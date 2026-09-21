import express from 'express';
import { reportsController } from './reports.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();
const admin = verifyToken([UserRole.ADMIN]);

router.get('/profit-loss', admin, reportsController.getProfitLossReport);

export const ReportsRoutes = router;
