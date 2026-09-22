import { Request, Response } from 'express';
import { purchaseServices } from './purchase.service';
import { catchAsync } from '../../utils/catchAsync';
import { AppError } from '../../utils/errorHandler';

const createPurchase = catchAsync(async (req: Request, res: Response) => {
  const purchaseData = req.body;

  const newPurchase = await purchaseServices.createPurchase(purchaseData);

  res.status(201).json({
    statusCode: 201,
    success: true,
    message: 'Purchase recorded successfully.',
    data: newPurchase,
  });
});

const getAllPurchases = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm } = req.query;
  const result = await purchaseServices.getAllPurchases(searchTerm as string);
  
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Purchases retrieved successfully',
    data: result,
  });
});

const getPurchaseById = catchAsync(async (req: Request, res: Response) => {
  const purchaseId: string = req.params.id;
  const purchase = await purchaseServices.getPurchaseById(purchaseId);

  if (!purchase) {
    throw new AppError('Purchase not found', 404);
  }

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Purchase retrieved successfully',
    data: purchase,
  });
});

const updatePurchase = catchAsync(async (req: Request, res: Response) => {
  const purchaseId: string = req.params.id;
  const purchaseData = req.body;

  const updatedPurchase = await purchaseServices.updatePurchase(purchaseId, purchaseData);

  if (!updatedPurchase) {
    throw new AppError('Purchase not found.', 404);
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Purchase updated successfully.',
    data: updatedPurchase,
  });
});

const deletePurchase = catchAsync(async (req: Request, res: Response) => {
  const purchaseId: string = req.params.id;
  const deletedPurchase = await purchaseServices.deletePurchase(purchaseId);

  if (!deletedPurchase) {
    throw new AppError('Purchase not found', 404);
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Purchase deleted successfully',
    data: deletedPurchase,
  });
});

export const purchaseController = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase
};
