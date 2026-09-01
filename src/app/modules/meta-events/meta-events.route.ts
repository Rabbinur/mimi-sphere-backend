import express from 'express';
import { MetaEventsController } from './meta-events.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post('/track', MetaEventsController.trackEvent);
router.get('/catalog.xml', MetaEventsController.generateCatalogFeed);
router.get('/catalog-diagnostics', MetaEventsController.getCatalogDiagnostics);
router.get(
  '/analytics',
  verifyToken([UserRole.ADMIN]),
  MetaEventsController.getAnalytics,
);

export const MetaEventsRoutes = router;
