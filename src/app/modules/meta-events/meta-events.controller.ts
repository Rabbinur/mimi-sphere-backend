import { Request, Response } from 'express';
import config from '../../config';
import { catchAsync } from '../../utils/catchAsync';
import { sendFBEvent } from '../../utils/facebookConversions';
import { CategoryModel } from '../category/category.model';
import { Product } from '../products/product.model';
import { MetaEventModel } from './meta-events.model';

const escapeXml = (unsafe: string): string => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const cleanHtml = (unsafe: string): string => {
  if (!unsafe) return '';
  const clean = unsafe.replace(/<[^>]*>/g, '');
  return escapeXml(clean);
};

const trackEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventName, eventId, userData, customData, eventSourceUrl } = req.body;

  await sendFBEvent({
    eventName,
    eventId,
    userData: {
      ...userData,
      client_ip_address: req.ip,
      client_user_agent: req.headers['user-agent'] as string,
      fbc: userData?.fbc || req.cookies?.['_fbc'],
      fbp: userData?.fbp || req.cookies?.['_fbp'],
    },
    customData,
    eventSourceUrl: eventSourceUrl || `${req.protocol}://${req.get('host')}${req.originalUrl}`,
  });

  res.status(200).json({
    success: true,
    message: 'Event tracked successfully',
  });
});

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate, page = 1, limit = 10 } = req.query;

  const query: any = {};
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string),
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  // 1. Total Counts by Event Name
  const eventCounts = await MetaEventModel.aggregate([
    { $match: query },
    { $group: { _id: '$eventName', count: { $sum: 1 } } },
  ]);

  // 2. Daily Trends
  const dailyTrends = await MetaEventModel.aggregate([
    { $match: query },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 3. Success vs Failure
  const statusCounts = await MetaEventModel.aggregate([
    { $match: query },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // 4. Recent Events with Pagination
  const totalEvents = await MetaEventModel.countDocuments(query);
  const recentEvents = await MetaEventModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: {
      eventCounts,
      dailyTrends,
      statusCounts,
      recentEvents,
      pagination: {
        total: totalEvents,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalEvents / Number(limit)),
      },
    },
  });
});

const generateCatalogFeed = catchAsync(async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write('<?xml version="1.0"?>\n');
  res.write('<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n');
  res.write('  <channel>\n');
  res.write('    <title>Mimi Sphere Product Catalog</title>\n');
  res.write(`    <link>${config.frontend_url}</link>\n`);
  res.write('    <description>Facebook Product Catalog Feed for Mimi Sphere</description>\n');

  // Pre-fetch categories to avoid N+1 queries during cursor iteration
  const categories = await CategoryModel.find({ isActive: true }).lean();
  const categoryMap = new Map(categories.map((c: any) => [String(c._id), c.name]));

  const cursor = Product.find({ product_status: 'active' }).cursor();
  const seenSkus = new Set<string>();

  for (let product = await cursor.next(); product != null; product = await cursor.next()) {
    const sku = product.sku?.trim();
    const title = product.product_title?.trim();
    const price = product.product_price;
    const urlHandle = product.url_handle?.trim();
    const image = product.thumbnail?.trim() || product.product_images?.[0]?.trim();

    if (!sku || !title || typeof price !== 'number' || price <= 0 || !urlHandle || !image) {
      continue;
    }

    if (seenSkus.has(sku)) {
      continue;
    }
    seenSkus.add(sku);

    const escapedSku = escapeXml(sku);
    const escapedTitle = escapeXml(title);
    const escapedDescription = cleanHtml(product.product_description || '');
    const escapedLink = escapeXml(`${config.frontend_url}/products/${urlHandle}`);
    const escapedImageLink = escapeXml(image);
    const brand = escapeXml(product.product_vendor || 'Mimi Sphere');

    let availability = 'in stock';
    if (product.is_pre_order) {
      availability = 'preorder';
    } else if (product.quantity <= 0) {
      availability = 'out of stock';
    }

    const firstCategoryId = product.product_categories?.[0] ? String(product.product_categories[0]) : null;
    const categoryName = firstCategoryId ? categoryMap.get(firstCategoryId) || 'General' : 'General';
    const escapedCategory = escapeXml(categoryName);

    res.write('    <item>\n');
    res.write(`      <g:id>${escapedSku}</g:id>\n`);
    res.write(`      <g:title>${escapedTitle}</g:title>\n`);
    res.write(`      <g:description>${escapedDescription}</g:description>\n`);
    res.write(`      <g:link>${escapedLink}</g:link>\n`);
    res.write(`      <g:image_link>${escapedImageLink}</g:image_link>\n`);
    res.write(`      <g:brand>${brand}</g:brand>\n`);
    res.write('      <g:condition>new</g:condition>\n');
    res.write(`      <g:availability>${availability}</g:availability>\n`);
    res.write(`      <g:price>${price.toFixed(2)} BDT</g:price>\n`);
    res.write(`      <g:google_product_category>${escapedCategory}</g:google_product_category>\n`);
    res.write(`      <g:product_type>${escapedCategory}</g:product_type>\n`);
    res.write('    </item>\n');
  }

  res.write('  </channel>\n');
  res.write('</rss>\n');
  res.end();
});

const getCatalogDiagnostics = catchAsync(async (req: Request, res: Response) => {
  const products = await Product.find()
    .populate('product_categories')
    .lean();

  const seenSkus = new Set<string>();
  const duplicateSkus = new Set<string>();

  for (const p of products) {
    if (p.sku) {
      const cleanSku = p.sku.trim();
      if (seenSkus.has(cleanSku)) {
        duplicateSkus.add(cleanSku);
      }
      seenSkus.add(cleanSku);
    }
  }

  const skippedProducts: any[] = [];
  const diagnostics = {
    total_products_checked: products.length,
    active_products_count: 0,
    valid_catalog_products_count: 0,
    skipped_products_count: 0,
    missing_sku: 0,
    duplicate_sku: 0,
    missing_image: 0,
    missing_price: 0,
    missing_url: 0,
    invalid_availability: 0,
  };

  const consistencyAudit: any[] = [];

  for (const p of products) {
    const isDraft = p.product_status === 'draft';
    if (p.product_status === 'active') {
      diagnostics.active_products_count++;
    }

    const sku = p.sku?.trim();
    const title = p.product_title?.trim();
    const price = p.product_price;
    const urlHandle = p.url_handle?.trim();
    const image = p.thumbnail?.trim() || p.product_images?.[0]?.trim();

    const errors: string[] = [];

    if (!sku) {
      errors.push('Missing SKU');
      diagnostics.missing_sku++;
    } else if (duplicateSkus.has(sku)) {
      errors.push(`Duplicate SKU: ${sku}`);
      diagnostics.duplicate_sku++;
    }

    if (!title) {
      errors.push('Missing Title');
    }

    if (typeof price !== 'number' || price <= 0) {
      errors.push('Missing or Invalid Price');
      diagnostics.missing_price++;
    }

    if (!urlHandle) {
      errors.push('Missing Product URL Handle');
      diagnostics.missing_url++;
    }

    if (!image) {
      errors.push('Missing Image');
      diagnostics.missing_image++;
    }

    if (p.quantity === undefined || p.quantity < 0) {
      diagnostics.invalid_availability++;
    }

    const isValid = errors.length === 0 && !isDraft;

    if (isValid) {
      diagnostics.valid_catalog_products_count++;
    } else {
      diagnostics.skipped_products_count++;
      skippedProducts.push({
        product_id: p._id,
        title: p.product_title || 'Untitled',
        status: p.product_status,
        sku: p.sku || null,
        reasons: errors,
      });
    }

    const catalogId = isValid ? sku : null;
    const trackingId = p.sku?.trim() || String(p._id);
    const isMatch = catalogId !== null && catalogId === trackingId;

    consistencyAudit.push({
      product_id: p._id,
      title: p.product_title || 'Untitled',
      sku: p.sku || null,
      catalog_id: catalogId,
      tracking_id: trackingId,
      is_consistent: isMatch,
      status: isMatch ? 'consistent' : catalogId === null ? 'skipped_from_catalog' : 'mismatch',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      diagnostics,
      skippedProducts,
      consistencyAudit,
    },
  });
});

export const MetaEventsController = {
  trackEvent,
  getAnalytics,
  generateCatalogFeed,
  getCatalogDiagnostics,
};
