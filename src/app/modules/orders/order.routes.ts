import express from 'express';
import { OrderController } from './order.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';
import { orderLimiter } from '../../middlewares/rateLimiter';

const router = express.Router();

router.post('/', orderLimiter, OrderController.createOrder);
router.post('/track', OrderController.trackOrder);
router.post(
  '/admin',
  verifyToken([UserRole.ADMIN]),
  OrderController.createOrderAdmin,
);

router.put('/cancel/:id', verifyToken([UserRole.USER]), OrderController.cancelOrder);
router.get(
  '/my-orders',
  verifyToken([UserRole.USER, UserRole.ADMIN]),
  OrderController.myOrders,
);

router.get(
  '/',
  verifyToken([UserRole.ADMIN]),
  OrderController.handleGetAllOrders,
);
router.get(
  '/channel-orders',
  verifyToken([UserRole.ADMIN]),
  OrderController.getChannelOrdersManagement,
);
router.get(
  '/:id',
  verifyToken([UserRole.USER, UserRole.ADMIN]),
  OrderController.singleOrder,
);
router.get(
  '/order-id/:order_id',
  OrderController.singleOrderByOrderId,
);
router.get(
  '/admin/:id',
  verifyToken([UserRole.ADMIN]),
  OrderController.singleOrder,
);
router.put(
  '/update/:id',
  verifyToken([UserRole.ADMIN]),
  OrderController.orderStatusUpdate,
);
router.delete(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  OrderController.deleteOrder,
);

router.get(
  '/invoice/:id',
  OrderController.downloadInvoice,
);
router.get(
  '/poly-label/:id',
  verifyToken([UserRole.ADMIN]),
  OrderController.downloadPolyLabel,
);
router.post(
  '/send-to-steadfast/:id',
  verifyToken([UserRole.ADMIN]),
  OrderController.sendToSteadfast,
);
router.post(
  '/send-to-carrybee/:id',
  verifyToken([UserRole.ADMIN]),
  OrderController.sendToCarrybee,
);
router.post(
  '/check-fraud',
  verifyToken([UserRole.ADMIN]),
  OrderController.checkFraud,
);

router.post('/webhook/carrybee', OrderController.handleCarrybeeWebhook);

export const OrderRoutes = router;
