import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { HttpStatusCode } from 'axios';
import { DiscountServices } from './discount.services';

export const createDiscount = catchAsync(async (req: Request, res: Response) => {
  const result = await DiscountServices.create(req.body);
  sendResponse(res, {
    statusCode: HttpStatusCode.Created,
    success: true,
    message: 'Discount created successfully',
    data: result,
  });
});

export const getDiscounts = catchAsync(async (req: Request, res: Response) => {
  const { search, status, customer, page, limit } = req.query;
  const result = await DiscountServices.getAll({
    search: search ? String(search) : undefined,
    status: status ? String(status) : undefined,
    customer: customer ? String(customer) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });

  sendResponse(res, {
    statusCode: HttpStatusCode.Ok,
    success: true,
    message: 'Discounts retrieved successfully',
    data: result.data,
    meta: result.pagination,
  });
});

export const getDiscountById = catchAsync(async (req: Request, res: Response) => {
  const result = await DiscountServices.getById(req.params.id);
  if (!result) {
    res.status(HttpStatusCode.NotFound).json({ success: false, message: 'Discount not found' });
    return;
  }
  sendResponse(res, {
    statusCode: HttpStatusCode.Ok,
    success: true,
    message: 'Discount details retrieved successfully',
    data: result,
  });
});

export const updateDiscount = catchAsync(async (req: Request, res: Response) => {
  const result = await DiscountServices.update(req.params.id, req.body);
  sendResponse(res, {
    statusCode: HttpStatusCode.Ok,
    success: true,
    message: 'Discount updated successfully',
    data: result,
  });
});

export const deleteDiscount = catchAsync(async (req: Request, res: Response) => {
  const result = await DiscountServices.delete(req.params.id);
  sendResponse(res, {
    statusCode: HttpStatusCode.Ok,
    success: true,
    message: 'Discount deleted successfully',
    data: result,
  });
});

export const getActiveDiscounts = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.query;
  const result = await DiscountServices.getActiveDiscounts(
    productId ? String(productId) : undefined
  );
  sendResponse(res, {
    statusCode: HttpStatusCode.Ok,
    success: true,
    message: 'Active discounts retrieved successfully',
    data: result,
  });
});
