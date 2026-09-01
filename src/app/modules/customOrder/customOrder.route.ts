import express from 'express';
import { CustomOrderController } from './customOrder.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post('/', CustomOrderController.createOrder);
router.get(
  '/admin',
  verifyToken([UserRole.ADMIN]),
  CustomOrderController.getOrders,
);
router.get(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  CustomOrderController.getOrderById,
);
router.put(
  '/:id/status',
  verifyToken([UserRole.ADMIN]),
  CustomOrderController.updateStatus,
);

export const CustomOrderRoutes = router;
