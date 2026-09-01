import express from 'express';
import { CouponController } from './coupon.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post('/', verifyToken([UserRole.ADMIN]), CouponController.createCoupon);
router.get('/', CouponController.getCoupons);
router.get('/:id', CouponController.getCouponById);
router.delete(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  CouponController.deleteCoupon,
);
router.put(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  CouponController.updateCoupon,
);
router.post('/apply', CouponController.applyCoupon);

export const CouponRoutes = router;
