import express from 'express';
import { posController } from './pos.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.get('/products', verifyToken([UserRole.ADMIN]), posController.getPosProducts);
router.get('/scan', verifyToken([UserRole.ADMIN]), posController.scanBarcode);
router.post('/orders', verifyToken([UserRole.ADMIN]), posController.createPosOrder);
router.get('/shift-summary', verifyToken([UserRole.ADMIN]), posController.getPosShiftSummary);

export const PosRoutes = router;
