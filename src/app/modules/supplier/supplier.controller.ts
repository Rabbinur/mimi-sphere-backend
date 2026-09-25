import { Request, Response } from 'express';
import { supplierServices } from './supplier.service';
import { SupplierModel } from './supplier.model';
import { catchAsync } from '../../utils/catchAsync';
import { AppError } from '../../utils/errorHandler';

const createSupplier = catchAsync(async (req: Request, res: Response) => {
  const supplierData = req.body;

  const exists = await SupplierModel.findOne({ name: supplierData.name });
  if (exists) {
    throw new AppError('Supplier with this name already exists.', 400);
  }

  const newSupplier = await supplierServices.createSupplier(supplierData);

  res.status(201).json({
    statusCode: 201,
    success: true,
    message: 'Supplier created successfully.',
    data: newSupplier,
  });
});

const getAllSuppliers = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm } = req.query;
  const result = await supplierServices.getAllSuppliers(searchTerm as string);
  
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Suppliers retrieved successfully',
    data: result,
  });
});

const getSupplierById = catchAsync(async (req: Request, res: Response) => {
  const supplierId: string = req.params.id;
  const supplier = await supplierServices.getSupplierById(supplierId);

  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Supplier retrieved successfully',
    data: supplier,
  });
});

const updateSupplier = catchAsync(async (req: Request, res: Response) => {
  const supplierId: string = req.params.id;
  const supplierData = req.body;

  const updatedSupplier = await supplierServices.updateSupplier(supplierId, supplierData);

  if (!updatedSupplier) {
    throw new AppError('Supplier not found.', 404);
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Supplier updated successfully.',
    data: updatedSupplier,
  });
});

const deleteSupplier = catchAsync(async (req: Request, res: Response) => {
  const supplierId: string = req.params.id;
  const deletedSupplier = await supplierServices.deleteSupplier(supplierId);

  if (!deletedSupplier) {
    throw new AppError('Supplier not found', 404);
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Supplier deleted successfully',
    data: deletedSupplier,
  });
});

const addPayment = catchAsync(async (req: Request, res: Response) => {
  const supplierId: string = req.params.id;
  const paymentData = req.body;
  
  const updatedSupplier = await supplierServices.addPaymentHistory(supplierId, paymentData);

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Payment added successfully.',
    data: updatedSupplier,
  });
});

export const supplierController = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  addPayment
};
