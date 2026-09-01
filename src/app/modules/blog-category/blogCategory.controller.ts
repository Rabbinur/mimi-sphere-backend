import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { BlogCategoryServices } from './blogCategory.service';

const createBlogCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogCategoryServices.createBlogCategoryIntoDB(req.body);
  res.status(201).json({
    success: true,
    message: 'Blog category created successfully',
    data: result,
  });
});

const getAllBlogCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogCategoryServices.getAllBlogCategoriesFromDB();
  res.status(200).json({
    success: true,
    message: 'Blog categories fetched successfully',
    data: result,
  });
});

const deleteBlogCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await BlogCategoryServices.deleteBlogCategoryFromDB(id);
  res.status(200).json({
    success: true,
    message: 'Blog category deleted successfully',
    data: null,
  });
});

export const BlogCategoryController = {
  createBlogCategory,
  getAllBlogCategories,
  deleteBlogCategory,
};
