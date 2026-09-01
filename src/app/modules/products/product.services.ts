import { TProduct } from './product.interface';
import { Product } from './product.model';
import { CategoryModel } from '../category/category.model';
import { AppError } from '../../utils/errorHandler';
import { CjUtils } from './cj.utils';
import { generateSlug } from '../../utils/generateSlug';
import { syncProductToGoogleMerchant, deleteProductFromGoogleMerchant } from './google-merchant.service';

const calculateDiscount = (price: number, comparePrice?: number): number => {
  if (comparePrice && comparePrice > price) {
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  }
  return 0;
};

const parsePrice = (priceVal: any): number => {
  if (typeof priceVal === 'number') return priceVal;
  if (!priceVal) return 0;
  const match = String(priceVal).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
};

const parseThumbnail = (thumb: any): string => {
  if (!thumb) return '';
  if (typeof thumb === 'string') {
    if (thumb.startsWith('[') && thumb.endsWith(']')) {
      try {
        const arr = JSON.parse(thumb);
        return Array.isArray(arr) && arr.length > 0 ? arr[0] : '';
      } catch (e) {
        return thumb;
      }
    }
    return thumb;
  }
  return '';
};

const createAProductIntoDB = async (productData: TProduct) => {
  const originalHandle = productData.url_handle;

  if (productData.sku) {
    const isSkuExists = await Product.findOne({ sku: productData.sku });
    if (isSkuExists) {
      throw new AppError('Product with this SKU already exists', 400);
    }
  }

  if (originalHandle) {
    let handle = originalHandle;
    let count = 1;

    // Check if handle exists and append count if it does
    while (await Product.exists({ url_handle: handle })) {
      handle = `${originalHandle}-${count}`;
      count++;
    }

    productData.url_handle = handle;
  }

  const result = await Product.create(productData);
  
  // Auto-sync to Google Merchant
  if (result.product_status === 'active') {
    syncProductToGoogleMerchant(result).catch(err => console.error('Auto-sync failed:', err));
  }

  return result;
};

const getSingleProductFromDB = async (id: string) => {
  const result = await Product.findById(id).populate('product_categories');
  return result;
};

const updateProductIntoDB = async (
  product_id: string,
  data: Partial<TProduct>,
) => {
  const existingProduct = await Product.findById(product_id);

  if (!existingProduct) {
    throw new AppError('Product not found', 404);
  }

  // Check SKU uniqueness if changed
  if (data.sku && data.sku !== existingProduct.sku) {
    const isSkuExists = await Product.findOne({ sku: data.sku });
    if (isSkuExists) {
      throw new AppError('Product with this SKU already exists', 400);
    }
  }

  // 1. If categories are being updated, verify they exist
  if (data.product_categories) {
    const categories = await CategoryModel.find({
      _id: { $in: data.product_categories },
    });
    if (categories.length !== data.product_categories.length) {
      throw new AppError('One or more categories not found', 404);
    }
  }

  // 2. If price or compare_price is updated, recalculate discount
  if (data.product_price !== undefined || data.compare_at_price !== undefined) {
    const price =
      data.product_price !== undefined
        ? data.product_price
        : existingProduct.product_price;
    const comparePrice =
      data.compare_at_price !== undefined
        ? data.compare_at_price
        : existingProduct.compare_at_price;

    data.discount_percentage = calculateDiscount(price, comparePrice);
  }

  // 3. Handle free delivery logic
  const isFreeDelivery =
    data.is_free_delivery !== undefined
      ? data.is_free_delivery
      : existingProduct.is_free_delivery;

  if (isFreeDelivery) {
    data.delivery_charge = {
      inside_dhaka: 0,
      outside_dhaka: 0,
    };
  }

  const result = await Product.findByIdAndUpdate(product_id, data, {
    new: true,
  });

  // Auto-sync to Google Merchant
  if (result && result.product_status === 'active') {
    syncProductToGoogleMerchant(result).catch(err => console.error('Auto-sync failed:', err));
  }

  return result;
};

const deleteProductFromDB = async (product_id: string) => {
  const product = await Product.findById(product_id);
  const result = await Product.findByIdAndDelete(product_id);

  if (product && product.product_status === 'active') {
    deleteProductFromGoogleMerchant(product._id.toString(), product.sku).catch(err => console.error('Auto-delete failed:', err));
  }

  return result;
};

const getProductFiltersFromDB = async () => {
  const [variantOptions, vendors] = await Promise.all([
    Product.aggregate([
      { $match: { product_status: 'active' } },
      { $unwind: '$product_options' },
      {
        $match: {
          'product_options.option_name': {
            $exists: true,
            $nin: ['', null, 'Choice', 'choice', 'Variant', 'variant'],
          },
        },
      },
      { $unwind: '$product_options.option_values' },
      {
        $match: {
          'product_options.option_values': { $exists: true, $nin: ['', null] },
        },
      },
      {
        $group: {
          _id: {
            name: '$product_options.option_name',
            value: '$product_options.option_values',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.name': 1, '_id.value': 1 } },
      {
        $group: {
          _id: '$_id.name',
          values: {
            $push: {
              value: '$_id.value',
              count: '$count',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          label: '$_id',
          values: 1,
        },
      },
      { $sort: { label: 1 } },
    ]),
    Product.aggregate([
      {
        $match: {
          product_status: 'active',
          product_vendor: { $exists: true, $nin: ['', null] },
        },
      },
      { $group: { _id: '$product_vendor', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          value: '$_id',
          count: 1,
        },
      },
    ]),
  ]);

  return {
    variants: variantOptions,
    brands: vendors,
  };
};

const importProductsFromCj = async (
  keyword: string = 'hoodie',
  categoryId?: string,
  importType: 'multi' | 'single' = 'multi',
) => {
  // 1. Get all active categories to find the most relevant one
  const allCategories = await CategoryModel.find({ isActive: true });

  // 2. Fetch products from CJ
  let cjProducts: any[] = [];
  if (importType === 'single') {
    const directProduct = await CjUtils.fetchProductDetail(keyword);
    if (directProduct) {
      cjProducts = [{ pid: directProduct.pid || keyword }];
    } else {
      const fetchedProducts = await CjUtils.fetchProducts(keyword, 1, 1);
      cjProducts = fetchedProducts.length > 0 ? [fetchedProducts[0]] : [];
    }
  } else {
    cjProducts = await CjUtils.fetchProducts(keyword, 1, 10);
  }
  const importedProducts = [];

  for (const item of cjProducts) {
    // Fetch full details for each product
    const fullProduct = await CjUtils.fetchProductDetail(item.pid || item.id);
    if (!fullProduct) continue;

    const slug = generateSlug(fullProduct.productNameEn);

    // Check if exists by title or slug to avoid duplicates
    const existingProduct = await Product.findOne({
      $or: [{ product_title: fullProduct.productNameEn }, { url_handle: slug }],
    });

    if (existingProduct) continue;

    // Smart category matching
    let category: any;

    if (categoryId) {
      category = allCategories.find((c) => c._id.toString() === categoryId);
    }

    if (!category) {
      category = allCategories.find(
        (c) =>
          fullProduct.categoryName
            ?.toLowerCase()
            .includes(c.name.toLowerCase()) ||
          c.name
            .toLowerCase()
            .includes(fullProduct.categoryName?.toLowerCase() || ''),
      );
    }

    // Fallback to Dropshipping if no match found
    if (!category) {
      category = await CategoryModel.findOne({ name: 'New Collection' });
      if (!category) {
        category = await CategoryModel.create({
          name: 'New Collection',
          slug: 'new-collection',
          description: 'New Collection Products',
          isActive: true,
        });
      }
    }

    const USD_TO_BDT = 122;
    const priceInUsd = parsePrice(fullProduct.sellPrice);
    const price = Math.round(priceInUsd * USD_TO_BDT); // Convert to BDT
    const comparePrice = Math.round(price * 1.5); // 50% markup for compare price

    // ─── Variant Parsing ───────────────────────────────────────────
    const KNOWN_COLORS = [
      'red',
      'blue',
      'green',
      'yellow',
      'black',
      'white',
      'brown',
      'beige',
      'purple',
      'pink',
      'orange',
      'grey',
      'gray',
      'navy',
      'teal',
      'gold',
      'silver',
      'cream',
      'khaki',
      'maroon',
      'ivory',
      'coral',
      'cyan',
      'magenta',
      'olive',
      'tan',
      'burgundy',
      'charcoal',
      'aqua',
      'lavender',
      'rose',
      'wine',
      'apricot',
      'camel',
      'coffee',
      'champagne',
    ];
    const SIZE_PATTERN = /^(xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|\d{1,3})$/i;

    const detectDimensionName = (values: string[]): string => {
      const lower = values.map((v) => v.toLowerCase());
      if (lower.every((v) => KNOWN_COLORS.some((c) => v.includes(c))))
        return 'Color';
      if (lower.every((v) => SIZE_PATTERN.test(v.trim()))) return 'Size';
      return 'Variant';
    };

    // Step 1: Clean variant names (strip product title prefix)
    const rawVariants = (fullProduct.variants || []).map((v) => {
      let name = v.variantNameEn;
      if (
        fullProduct.productNameEn &&
        name.toLowerCase().startsWith(fullProduct.productNameEn.toLowerCase())
      ) {
        name = name.substring(fullProduct.productNameEn.length).trim();
      }
      if (!name) name = v.variantNameEn || 'Default';
      return { ...v, cleanName: name };
    });

    // Step 2: Detect if variants are multi-dimensional (e.g. "White 36" = Color + Size)
    // Split each clean name by space and check consistency
    let parsedOptions: Array<{ option_name: string; option_values: string[] }> =
      [];
    let parsedVariants: Array<{
      optionMap: Record<string, string>;
      price: number;
      comparePrice: number;
      image: string;
    }> = [];

    if (rawVariants.length > 0) {
      const parts = rawVariants.map((v) => v.cleanName.split(/\s+/));
      const partCounts = parts.map((p) => p.length);
      const allSameLength = partCounts.every((c) => c === partCounts[0]);
      const dimensionCount = partCounts[0] || 1;

      if (allSameLength && dimensionCount >= 2) {
        // Multi-dimensional: e.g. "White 36" → ["White", "36"]
        // Collect unique values for each dimension position
        const dimensions: string[][] = Array.from(
          { length: dimensionCount },
          () => [],
        );
        for (const p of parts) {
          p.forEach((val, i) => {
            if (!dimensions[i].includes(val)) dimensions[i].push(val);
          });
        }

        // Validate: total combos should roughly match variant count
        const expectedCombos = dimensions.reduce((acc, d) => acc * d.length, 1);
        const isMultiDim = expectedCombos === rawVariants.length;

        if (isMultiDim && dimensionCount <= 3) {
          // Detect each dimension name
          const dimNames = dimensions.map((vals) => detectDimensionName(vals));

          // Avoid duplicate dimension names
          const usedNames = new Set<string>();
          const finalDimNames = dimNames.map((name, i) => {
            if (usedNames.has(name)) {
              const fallback = `Option ${i + 1}`;
              usedNames.add(fallback);
              return fallback;
            }
            usedNames.add(name);
            return name;
          });

          parsedOptions = finalDimNames.map((name, i) => ({
            option_name: name,
            option_values: dimensions[i],
          }));

          parsedVariants = rawVariants.map((v) => {
            const splitParts = v.cleanName.split(/\s+/);
            const optionMap: Record<string, string> = {};
            finalDimNames.forEach((name, i) => {
              optionMap[name] = splitParts[i] || '';
            });
            return {
              optionMap,
              price: Math.round(parsePrice(v.variantSellPrice) * USD_TO_BDT),
              comparePrice: Math.round(
                parsePrice(v.variantSellPrice) * USD_TO_BDT * 1.5,
              ),
              image: v.variantImage || fullProduct.productImage,
            };
          });
        }
      }

      // Fallback: single-dimension
      if (parsedOptions.length === 0) {
        const allValues = rawVariants.map((v) => v.cleanName);
        const optionName = detectDimensionName(allValues);
        parsedOptions = [
          {
            option_name: optionName,
            option_values: Array.from(new Set(allValues.filter(Boolean))),
          },
        ];
        parsedVariants = rawVariants.map((v) => ({
          optionMap: { [optionName]: v.cleanName },
          price: Math.round(parsePrice(v.variantSellPrice) * USD_TO_BDT),
          comparePrice: Math.round(
            parsePrice(v.variantSellPrice) * USD_TO_BDT * 1.5,
          ),
          image: v.variantImage || fullProduct.productImage,
        }));
      }
    }

    // Map to TProduct
    const productData: TProduct = {
      product_title: fullProduct.productNameEn,
      product_description:
        fullProduct.description ||
        fullProduct.productNameEn ||
        'No description available',
      product_price: price,
      compare_at_price: comparePrice,
      thumbnail: parseThumbnail(fullProduct.productImage),
      product_images: fullProduct.productImageSet || [],
      sku: fullProduct.productSku,
      quantity: 100,
      moq: 1,
      product_categories: [category._id],
      product_vendor: fullProduct.supplierName || 'CJ Warehouse',
      country_of_origin: 'China',
      product_status: 'draft',
      url_handle: slug,
      discount_percentage: calculateDiscount(price, comparePrice),
      product_options: parsedOptions,
      product_variants: parsedVariants.map((v) => ({
        variant_option_values: v.optionMap,
        variant_price: v.price,
        compare_at_price: v.comparePrice,
        image: v.image,
      })),
    };

    const result = await createAProductIntoDB(productData);
    importedProducts.push(result);
  }

  return importedProducts;
};

export const ProductServices = {
  createAProductIntoDB,
  getSingleProductFromDB,
  updateProductIntoDB,
  deleteProductFromDB,
  getProductFiltersFromDB,
  calculateDiscount,
  importProductsFromCj,
};
