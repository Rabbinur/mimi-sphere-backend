/* eslint-disable no-console */
// src/modules/category/category.controller.ts

import { Request, Response } from 'express';

import { TCategory } from './category.interface';
import { categoryServices } from './category.service';
import { CategoryModel } from './category.model';
import { generateSlug } from '../../utils/generateSlug';

const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryData = req.body;
    const slug = generateSlug(categoryData.name);
    categoryData.slug = slug;

    const rawOrder = categoryData.order;
    if (rawOrder !== undefined && rawOrder !== null && rawOrder !== '') {
      const parsedOrder = Number(rawOrder);
      if (isNaN(parsedOrder) || parsedOrder < 0 || !Number.isInteger(parsedOrder)) {
        res.status(400).json({
          statusCode: 400,
          success: false,
          message: 'Order must be a non-negative integer.',
        });
        return;
      }
      categoryData.order = parsedOrder;
    } else {
      delete categoryData.order;
    }

    if (categoryData.isActive !== undefined) {
      categoryData.isActive = Boolean(categoryData.isActive);
    }

    if (categoryData.showInNavbar !== undefined) {
      categoryData.showInNavbar = Boolean(categoryData.showInNavbar);
    }

    // Prevent duplicate category names
    const exists = await CategoryModel.findOne({ name: categoryData.name });
    if (exists) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Category with this name already exists.',
      });
      return;
    }

    const newCategory = await categoryServices.createCategory(categoryData);

    res.status(201).json({
      statusCode: 201,
      success: true,
      message: 'Category created successfully.',
      data: newCategory,
    });
  } catch (error) {
    console.error('Error creating category:', error);

    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Failed to create category.',
      error: (error as Error).message,
    });
  }
};

const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId: string = req.params.id;
    const category = await categoryServices.getCategoryById(categoryId);

    if (category) {
      res.status(200).json(category);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({
      error: 'Failed to get category',
      details: (error as Error).message,
    });
  }
};

const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  const subCategory: boolean = req.query.sub_categories !== 'false';
  let isActive: boolean | undefined = undefined;
  if (req.query.isActive === 'true') {
    isActive = true;
  } else if (req.query.isActive === 'false') {
    isActive = false;
  }

  let showInNavbar: boolean | undefined = undefined;
  if (req.query.showInNavbar === 'true') {
    showInNavbar = true;
  } else if (req.query.showInNavbar === 'false') {
    showInNavbar = false;
  }

  try {
    const categories = await categoryServices.getAllCategories(subCategory, isActive, showInNavbar);

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error getting all categories:', error);
    res.status(500).json({
      error: 'Failed to get categories',
      details: (error as Error).message,
    });
  }
};

// Update category
const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId: string = req.params.id;
    const categoryData: Partial<TCategory> = req.body;

    const rawOrder = (categoryData as any).order;
    if (rawOrder !== undefined && rawOrder !== null && rawOrder !== '') {
      const parsedOrder = Number(rawOrder);
      if (isNaN(parsedOrder) || parsedOrder < 0 || !Number.isInteger(parsedOrder)) {
        res.status(400).json({
          statusCode: 400,
          success: false,
          message: 'Order must be a non-negative integer.',
        });
        return;
      }
      categoryData.order = parsedOrder;
    }

    if (categoryData.isActive !== undefined) {
      categoryData.isActive = Boolean(categoryData.isActive);
    }

    if (categoryData.showInNavbar !== undefined) {
      categoryData.showInNavbar = Boolean(categoryData.showInNavbar);
    }

    if (categoryData.name) {
      categoryData.slug = generateSlug(categoryData.name);
    }

    const updatedCategory = await categoryServices.updateCategory(
      categoryId,
      categoryData,
    );

    if (updatedCategory) {
      res.status(200).json({
        statusCode: 200,
        success: true,
        message: 'Category updated successfully.',
        data: updatedCategory,
      });
    } else {
      res.status(404).json({
        statusCode: 404,
        success: false,
        message: 'Category not found.',
      });
    }
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Failed to update category.',
      error: (error as Error).message,
    });
  }
};

// Delete category
const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId: string = req.params.id;
    const deletedCategory = await categoryServices.deleteCategory(categoryId);

    if (!deletedCategory) {
      res.status(404).json({
        statusCode: 404,
        status: 'fail',
        message: 'Category not found',
      });
      return;
    }

    res.status(200).json({
      statusCode: 200,
      status: 'success',
      message: 'Category deleted successfully',
      deletedCategory,
    });
  } catch (error) {
    console.error('Error deleting category:', error);

    res.status(500).json({
      statusCode: 500,
      status: 'error',
      message: 'Failed to delete category',
      details: (error as Error).message,
    });
  }
};

const updateCategoryOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryOrders = req.body.categories || req.body.categoryOrders;
    if (!Array.isArray(categoryOrders)) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Invalid payload. An array of categories with id and order is required.',
      });
      return;
    }

    await categoryServices.updateCategoryOrder(categoryOrders);

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Category order updated successfully.',
    });
  } catch (error) {
    console.error('Error updating category order:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Failed to update category order.',
      error: (error as Error).message,
    });
  }
};

export const categoryController = {
  createCategory,
  getCategoryById,
  getAllCategories,
  updateCategory,
  deleteCategory,
  updateCategoryOrder,
};
