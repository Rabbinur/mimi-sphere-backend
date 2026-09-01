import express from 'express';
import { GoogleAnalyticsController } from './google-analytics.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.get(
  '/analytics',
  verifyToken([UserRole.ADMIN]),
  GoogleAnalyticsController.getAnalytics,
);

export const GoogleAnalyticsRoutes = router;
