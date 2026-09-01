/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';

import { ProductServices } from './product.services';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { paginate } from '../../utils/pagination';

import { generateSlug } from '../../utils/generateSlug';
import { productValidationSchema } from './product.validation';
import { CategoryModel } from '../category/category.model';
import { categoryServices } from '../category/category.service';
import { catchAsync } from '../../utils/catchAsync';
import { AppError } from '../../utils/errorHandler';
import { ScraperUtils } from './scraper.utils';
import { sendFBEvent } from '../../utils/facebookConversions';
import { sendGAEvent } from '../../utils/googleAnalytics';

import {
  syncAllProductsToGoogleMerchant,
  syncProductToGoogleMerchant,
} from './google-merchant.service';

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getQueryValue = (value: unknown) => {
  if (Array.isArray(value)) return value[0]?.toString() || '';
  return value?.toString() || '';
};

const getQueryArray = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.map((v) => v?.toString() || '').filter(Boolean);
  if (typeof value === 'string')
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return value ? [value.toString()] : [];
};

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const validatedData = productValidationSchema.parse(req.body);

  // Verify all categories exist
  const categories = await CategoryModel.find({
    _id: { $in: validatedData.product_categories },
  });
  if (categories.length !== validatedData.product_categories.length) {
    throw new AppError('One or more categories not found', 404);
  }

  const newProduct = {
    ...validatedData,
    product_categories: categories.map((c) => c._id),
    url_handle: generateSlug(validatedData.product_title),
  };

  const result = await ProductServices.createAProductIntoDB(newProduct);

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const searchTerm = getQueryValue(req.query.searchTerm);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = getQueryValue(req.query.category);
  const sort = getQueryValue(req.query.sort) || 'latest';
  const brand = getQueryValue(req.query.brand);

  const variantFilters = Object.entries(req.query).reduce<
    Record<string, string[]>
  >((acc, [key, value]) => {
    if (key.startsWith('variant_')) {
      const name = key.replace('variant_', '').toLowerCase();
      const val = getQueryArray(value);
      if (name && val.length > 0) {
        // Deduplicate values to prevent redundant queries
        acc[name] = Array.from(new Set(val));
      }
    }
    return acc;
  }, {});

  const searchQuery: any = { product_status: 'active' };

  // 🔍 search - Using $text index for performance
  if (searchTerm) {
    searchQuery.$text = { $search: searchTerm };
  }

  // 🏷️ brand
  if (brand) {
    searchQuery.product_vendor = {
      $regex: `^${escapeRegex(brand)}$`,
      $options: 'i',
    };
  }

  // 📂 category
  if (category && category !== 'new-collection') {
    const categoryData = await categoryServices.getCategoryBySlug(category);
    if (!categoryData) {
      return res.status(200).json({
        success: true,
        message: 'Products fetched successfully',
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }
    searchQuery.product_categories = categoryData._id;
  }

  // ✅ VARIANT FILTER — Optimized for performance using exact matches
  if (Object.keys(variantFilters).length > 0) {
    const conditions = Object.entries(variantFilters).map(([name, values]) => {
      return {
        $or: [
          {
            product_variants: {
              $elemMatch: {
                [`variant_option_values.${name}`]: { $in: values },
              },
            },
          },
          {
            product_options: {
              $elemMatch: {
                option_name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
                option_values: { $in: values },
              },
            },
          },
        ],
      };
    });

    searchQuery.$and = [...(searchQuery.$and || []), ...conditions];
  }

  // 🔃 sort
  let sortQuery: any;
  const hours = 1;
  const seed = Math.floor(Date.now() / (hours * 60 * 60 * 1000));
  const randomSorts = [
    { createdAt: -1 },
    { product_price: 1 },
    { product_title: 1 },
    { discount_percentage: -1 },
    { createdAt: 1 },
    { product_price: -1 },
    { product_title: -1 },
    { discount_percentage: 1 },
  ];

  if (searchTerm && (!req.query.sort || req.query.sort === 'latest')) {
    sortQuery = { score: { $meta: 'textScore' } };
  } else if (sort === 'lowToHigh') {
    sortQuery = { product_price: 1 };
  } else if (sort === 'highToLow') {
    sortQuery = { product_price: -1 };
  } else if (sort === 'titleAsc') {
    sortQuery = { product_title: 1 };
  } else if (sort === 'titleDesc') {
    sortQuery = { product_title: -1 };
  } else if (sort === 'latest') {
    sortQuery = { createdAt: -1 };
  } else {
    // Default or explicit 'random'
    sortQuery = randomSorts[seed % randomSorts.length];
  }

  // 📦 query
  const result = await paginate(Product, searchQuery, page, limit, sortQuery);

  // 🎯 response
  const limitedFields = result.data.map((product: TProduct) => ({
    _id: product._id,
    product_title: product.product_title,
    url_handle: product.url_handle,
    thumbnail: product.thumbnail,
    product_price: product.product_price,
    compare_at_price: product.compare_at_price,
    discount_percentage: Math.round(product.discount_percentage ?? 0),
    product_vendor: product.product_vendor,
    product_variants: product.product_variants,
    quantity: product.quantity,
    moq: product.moq,
    is_pre_order: product.is_pre_order,
    pre_order_message: product.pre_order_message,
    is_free_delivery: product.is_free_delivery,
  }));

  // 🛡️ Edge Caching: Cache for 1 min, stale-while-revalidate for 30s
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=30',
  );

  res.status(200).json({
    success: true,
    message: 'Products fetched successfully',
    data: limitedFields,
    pagination: result.pagination,
  });
});

const getProductFilters = catchAsync(async (_req: Request, res: Response) => {
  const result = await ProductServices.getProductFiltersFromDB();

  res.status(200).json({
    success: true,
    message: 'Product filters fetched successfully',
    data: result,
  });
});

const getFeaturedProducts = catchAsync(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 12;
  const hours = 1;
  const seed = Math.floor(Date.now() / (hours * 60 * 60 * 1000));
  const randomSorts = [
    { createdAt: -1 },
    { product_price: 1 },
    { product_title: 1 },
    { createdAt: 1 },
    { product_price: -1 },
    { product_title: -1 },
  ];

  const result = await Product.find({
    product_status: 'active',
    is_featured: true,
  })
    .sort(randomSorts[seed % randomSorts.length] as any)
    .limit(limit)
    .lean();

  const limitedFields = result.map((product: TProduct) => ({
    _id: product._id,
    product_title: product.product_title,
    thumbnail: product.thumbnail,
    url_handle: product.url_handle,
    product_price: product.product_price,
    compare_at_price: product.compare_at_price,
    discount_percentage: Math.round(product.discount_percentage ?? 0),
    product_vendor: product.product_vendor,
    product_attributes: product.product_attributes,
    product_options: product.product_options,
    product_variants: product.product_variants,
    quantity: product.quantity,
    moq: product.moq,
    is_pre_order: product.is_pre_order,
    pre_order_message: product.pre_order_message,
    is_free_delivery: product.is_free_delivery,
  }));

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=600',
  );
  res.status(200).json({
    success: true,
    message: 'Featured products fetched successfully',
    data: limitedFields,
  });
});

const getTrendyProducts = catchAsync(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 12;
  const hours = 1;
  const seed = Math.floor(Date.now() / (hours * 60 * 60 * 1000));
  const randomSorts = [
    { createdAt: -1 },
    { product_price: 1 },
    { product_title: 1 },
    { createdAt: 1 },
    { product_price: -1 },
    { product_title: -1 },
  ];

  const result = await Product.find({
    is_trendy: true,
    product_status: 'active',
  })
    .sort(randomSorts[seed % randomSorts.length] as any)
    .limit(limit)
    .lean();
  const limitedFields = result.map((product: TProduct) => ({
    _id: product._id,
    product_title: product.product_title,
    thumbnail: product.thumbnail,
    url_handle: product.url_handle,
    product_price: product.product_price,
    compare_at_price: product.compare_at_price,
    discount_percentage: Math.round(product.discount_percentage ?? 0),
    product_vendor: product.product_vendor,
    product_attributes: product.product_attributes,
    product_options: product.product_options,
    product_variants: product.product_variants,
    quantity: product.quantity,
    moq: product.moq,
    is_pre_order: product.is_pre_order,
    pre_order_message: product.pre_order_message,
    is_free_delivery: product.is_free_delivery,
  }));

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=600',
  );
  res.status(200).json({
    success: true,
    message: 'Trendy products fetched successfully',
    data: limitedFields,
  });
});

const syncToGoogleMerchant = catchAsync(async (req: Request, res: Response) => {
  const products = await Product.find({ product_status: 'active' }).lean();
  const results = await syncAllProductsToGoogleMerchant(products);

  res.status(200).json({
    success: true,
    message: 'Sync process completed',
    data: results,
  });
});

const getProductsByCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const searchQuery = { product_categories: id, product_status: 'active' };
    const result = await paginate(Product, searchQuery, page, limit);

    const limitedFields = result.data.map((product: any) => ({
      _id: product._id,
      product_title: product.product_title,
      url_handle: product.url_handle,
      thumbnail: product.thumbnail,
      product_price: product.product_price,
      compare_at_price: product.compare_at_price,
      discount_percentage: Math.round(product.discount_percentage ?? 0),
      product_vendor: product.product_vendor,
      product_variants: product.product_variants,
      quantity: product.quantity,
      moq: product.moq,
      is_pre_order: product.is_pre_order,
      pre_order_message: product.pre_order_message,
      is_free_delivery: product.is_free_delivery,
    }));

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=60',
    );
    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: limitedFields,
      pagination: result.pagination,
    });
  },
);

const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;

  if (!slug) {
    throw new AppError('Product slug is required', 400);
  }

  // find product by url_handle (slug) and ensure it's active
  const productData = await Product.findOne({
    url_handle: slug,
    product_status: 'active',
  })
    .populate('product_categories')
    .lean();

  if (!productData) {
    throw new AppError('Product not found', 404);
  }

  // find related products in same categories, exclude the current product
  const relatedProducts = await Product.find({
    product_categories: { $in: productData.product_categories },
    product_status: 'active',
    _id: { $ne: productData._id },
  })
    .limit(5)
    .lean();

  res.status(200).json({
    success: true,
    message: 'Product fetched successfully',
    data: {
      product: productData,
      relatedProducts,
    },
  });

  // Send Google Analytics view_item Event
  sendGAEvent({
    eventName: 'view_item',
    clientId: req.cookies?.['_ga'] || 'anonymous',
    params: {
      items: [
        {
          item_id: productData._id,
          item_name: productData.product_title,
          price: productData.product_price,
          currency: 'BDT',
        },
      ],
      value: productData.product_price,
      currency: 'BDT',
    },
  });
});

const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await ProductServices.getSingleProductFromDB(id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }
  const relatedProducts = await Product.find({
    product_categories: { $in: product.product_categories },
    _id: { $ne: id },
  })
    .limit(5)
    .lean();

  res.status(200).json({
    success: true,
    message: 'Product fetched successfully',
    data: {
      product,
      relatedProducts,
    },
  });

  // Send Google Analytics view_item Event
  sendGAEvent({
    eventName: 'view_item',
    clientId: req.cookies?.['_ga'] || 'anonymous',
    params: {
      items: [
        {
          item_id: product._id,
          item_name: product.product_title,
          price: product.product_price,
          currency: 'BDT',
        },
      ],
      value: product.product_price,
      currency: 'BDT',
    },
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await ProductServices.updateProductIntoDB(id, data);
  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await ProductServices.deleteProductFromDB(id);
  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
    data: null,
  });
});

// product.controller.ts (add this function somewhere in the file)
const getProductsForAdmin = catchAsync(async (req: Request, res: Response) => {
  // optional search parameter
  const searchTerm = req.query.searchTerm?.toString() || '';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category?.toString() || '';

  const searchQuery: FilterQuery<TProduct> = {};
  if (searchTerm) {
    const escapedSearchTerm = escapeRegex(searchTerm);
    // search in title, description, vendor
    searchQuery.$or = [
      { product_title: { $regex: escapedSearchTerm, $options: 'i' } },
      { product_description: { $regex: escapedSearchTerm, $options: 'i' } },
      { product_vendor: { $regex: escapedSearchTerm, $options: 'i' } },
      { sku: { $regex: escapedSearchTerm, $options: 'i' } },
      { url_handle: { $regex: escapedSearchTerm, $options: 'i' } },
    ];
  }
  if (category) {
    searchQuery.product_categories = category;
  }

  // Use paginate to get full documents (admin sees all fields)
  const result = await paginate(
    Product,
    searchQuery,
    page,
    limit,
    undefined,
    'product_categories',
  );

  res.status(200).json({
    success: true,
    message: 'Products (admin) fetched successfully',
    ...result, // contains data and pagination
  });
});

const importCjProducts = catchAsync(async (req: Request, res: Response) => {
  const { keyword, categoryId, importType } = req.body;
  const result = await ProductServices.importProductsFromCj(
    keyword,
    categoryId,
    importType,
  );

  res.status(200).json({
    success: true,
    message: `${result.length} products imported successfully from CJ Dropshipping`,
    data: result,
  });
});

const scrapeProduct = catchAsync(async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    throw new AppError('URL is required', 400);
  }

  let data;
  const normalizedUrl = url.toLowerCase();
  if (normalizedUrl.includes('kcbazar')) {
    data = await ScraperUtils.scrapeKcbazar(url);
  } else {
    throw new AppError('Unsupported website for scraping', 400);
  }

  res.status(200).json({
    success: true,
    message: 'Product data scraped successfully',
    data,
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts,
  getProductFilters,
  getProductsForAdmin,
  getProductBySlug,
  importCjProducts,
  getTrendyProducts,
  scrapeProduct,
  syncToGoogleMerchant,
};
