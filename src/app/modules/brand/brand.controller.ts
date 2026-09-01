import { Request, Response } from 'express';
import { brandServices } from './brand.service';
import { BrandModel } from './brand.model';
import { generateSlug } from '../../utils/generateSlug';
import { catchAsync } from '../../utils/catchAsync';
import { AppError } from '../../utils/errorHandler';
import { Product } from '../products/product.model';

const syncBrandsFromProducts = catchAsync(async (req: Request, res: Response) => {
  const vendors = await Product.distinct('product_vendor');

  const results = [];
  for (const name of vendors) {
    if (!name || name.trim() === '') continue;

    const exists = await BrandModel.findOne({ name: name.trim() });
    if (!exists) {
      const slug = generateSlug(name.trim());
      const newBrand = await BrandModel.create({
        name: name.trim(),
        slug,
        isActive: true,
        order: 0,
      });
      results.push({ name: name.trim(), status: 'created', data: newBrand });
    } else {
      results.push({ name: name.trim(), status: 'exists' });
    }
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Brands synced successfully.',
    totalProcessed: results.length,
    details: results,
  });
});

const createBrand = catchAsync(async (req: Request, res: Response) => {
  const brandData = req.body;
  const slug = generateSlug(brandData.name);
  brandData.slug = slug;

  const exists = await BrandModel.findOne({ name: brandData.name });
  if (exists) {
    throw new AppError('Brand with this name already exists.', 400);
  }

  const newBrand = await brandServices.createBrand(brandData);

  res.status(201).json({
    statusCode: 201,
    success: true,
    message: 'Brand created successfully.',
    data: newBrand,
  });
});

const getAllBrands = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, searchTerm } = req.query;
  const result = await brandServices.getAllBrands(
    page as string,
    limit as string,
    searchTerm as string,
  );
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Brands retrieved successfully',
    data: result,
  });
});

const getBrandById = catchAsync(async (req: Request, res: Response) => {
  const brandId: string = req.params.id;
  const brand = await brandServices.getBrandById(brandId);

  if (!brand) {
    throw new AppError('Brand not found', 404);
  }

  res.status(200).json(brand);
});

const getBrandBySlug = catchAsync(async (req: Request, res: Response) => {
  const slug: string = req.params.slug;
  const brand = await brandServices.getBrandBySlug(slug);

  if (!brand) {
    throw new AppError('Brand not found', 404);
  }

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Brand retrieved successfully.',
    data: brand,
  });
});

const updateBrand = catchAsync(async (req: Request, res: Response) => {
  const brandId: string = req.params.id;
  const brandData = req.body;

  if (brandData.name) {
    brandData.slug = generateSlug(brandData.name);
  }

  const updatedBrand = await brandServices.updateBrand(brandId, brandData);

  if (!updatedBrand) {
    throw new AppError('Brand not found.', 404);
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Brand updated successfully.',
    data: updatedBrand,
  });
});

const deleteBrand = catchAsync(async (req: Request, res: Response) => {
  const brandId: string = req.params.id;
  const deletedBrand = await brandServices.deleteBrand(brandId);

  if (!deletedBrand) {
    throw new AppError('Brand not found', 404);
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Brand deleted successfully',
    data: deletedBrand,
  });
});

const updateBrandOrder = catchAsync(async (req: Request, res: Response) => {
  const { brandOrders } = req.body;
  await brandServices.updateBrandOrder(brandOrders);

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Brand order updated successfully.',
  });
});

export const brandController = {
  syncBrandsFromProducts,
  createBrand,
  getAllBrands,
  getBrandById,
  getBrandBySlug,
  updateBrand,
  deleteBrand,
  updateBrandOrder,
};
