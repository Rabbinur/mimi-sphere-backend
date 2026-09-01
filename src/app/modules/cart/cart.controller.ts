import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { CartServices } from './cart.service';

const addToCart = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { item } = req.body;
  const result = await CartServices.addToCart(userId, item);

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: result,
  });
});

const getCart = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await CartServices.getCart(userId);

  res.status(200).json({
    success: true,
    message: 'Cart fetched successfully',
    data: result,
  });
});

const updateCartItemQuantity = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { product, variantId, quantity } = req.body;
  const result = await CartServices.updateCartItemQuantity(
    userId,
    product,
    variantId,
    quantity
  );

  res.status(200).json({
    success: true,
    message: 'Cart updated successfully',
    data: result,
  });
});

const removeCartItem = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { product, variantId } = req.query as any; // Using query for DELETE if needed, or body
  const result = await CartServices.removeCartItem(userId, product, variantId);

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: result,
  });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await CartServices.clearCart(userId);

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully',
    data: result,
  });
});

const syncCart = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const { items } = req.body;
  const result = await CartServices.syncCart(userId, items);

  res.status(200).json({
    success: true,
    message: 'Cart synced successfully',
    data: result,
  });
});

export const CartController = {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  syncCart,
};
