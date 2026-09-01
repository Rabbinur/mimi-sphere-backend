import express from 'express';
import verifyToken from '../../middlewares/verifyToken';
import { CartController } from './cart.controller';
import validateRequest from '../../middlewares/validateRequest';
import { CartValidation } from './cart.validation';

const router = express.Router();

router.get('/', verifyToken(), CartController.getCart);

router.post(
  '/add',
  verifyToken(),
  validateRequest(CartValidation.addToCartValidationSchema),
  CartController.addToCart
);

router.patch(
  '/update',
  verifyToken(),
  validateRequest(CartValidation.updateCartItemValidationSchema),
  CartController.updateCartItemQuantity
);

router.delete(
  '/remove',
  verifyToken(),
  CartController.removeCartItem
);

router.delete(
  '/clear',
  verifyToken(),
  CartController.clearCart
);

router.post(
  '/sync',
  verifyToken(),
  validateRequest(CartValidation.syncCartValidationSchema),
  CartController.syncCart
);

export const CartRoutes = router;
