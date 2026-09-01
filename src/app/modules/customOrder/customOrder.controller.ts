import { Request, Response } from 'express';
import { CustomOrderService } from './customOrder.service';

const createOrder = async (req: Request, res: Response) => {
  const result = await CustomOrderService.createCustomOrder(req.body);

  res.status(201).json({
    success: true,
    message: 'Custom order created successfully',
    data: result,
  });
};

const getOrders = async (req: Request, res: Response) => {
  const { search } = req.query;

  const result = await CustomOrderService.getAllCustomOrders(search as string);

  res.status(200).json({
    success: true,
    data: result,
  });
};

const getOrderById = async (req: Request, res: Response) => {
  const result = await CustomOrderService.getSingleCustomOrder(req.params.id);

  res.status(200).json({
    success: true,
    data: result,
  });
};

const updateStatus = async (req: Request, res: Response) => {
  const result = await CustomOrderService.updateOrderStatus(
    req.params.id,
    req.body.status,
  );

  res.status(200).json({
    success: true,
    message: 'Order status updated',
    data: result,
  });
};

export const CustomOrderController = {
  createOrder,
  getOrders,
  getOrderById,
  updateStatus,
};
