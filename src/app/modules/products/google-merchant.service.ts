import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { TProduct } from './product.interface';
import config from '../../config';

const KEY_FILE_PATH = path.join(process.cwd(), 'service-account.json');
const MERCHANT_ID = '5781290190';

export const syncProductToGoogleMerchant = async (product: any) => {
  if (!fs.existsSync(KEY_FILE_PATH)) {
    console.warn(
      'Google Service Account key file not found at:',
      KEY_FILE_PATH,
    );
    return { success: false, message: 'Service account key file missing' };
  }

  // 1. Policy Filter: Alcoholic Beverages
  const alcoholKeywords = [
    'alcohol',
    'wine',
    'beer',
    'vodka',
    'whiskey',
    'rum',
    'gin',
    'brandy',
    'spirit',
    'liquor',
    'champagne',
    'tequila',
    'sake',
    'cider',
  ];
  const title = (product.product_title || '').toLowerCase();
  const description = (product.product_description || '').toLowerCase();

  if (
    alcoholKeywords.some(
      (keyword) => title.includes(keyword) || description.includes(keyword),
    )
  ) {
    console.warn(
      `⚠️ [Google Merchant] Skipping alcoholic beverage: ${product.product_title}`,
    );
    return {
      success: false,
      message: 'Product matches alcoholic beverage policy',
    };
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/content'],
  });

  const client = await auth.getClient();
  const content = google.content({
    version: 'v2.1',
    auth: client as any,
  });

  let mainImageUrl =
    product.thumbnail ||
    (product.product_images && product.product_images[0]) ||
    '';

  // Handle if thumbnail is a stringified array (common in some scrapers)
  if (mainImageUrl.startsWith('[') && mainImageUrl.endsWith(']')) {
    try {
      const arr = JSON.parse(mainImageUrl);
      if (Array.isArray(arr) && arr.length > 0) mainImageUrl = arr[0];
    } catch (e) {
      // Not a JSON array, keep as is
    }
  }

  // Ensure absolute URL if it starts with /
  if (
    mainImageUrl &&
    mainImageUrl.startsWith('/') &&
    config.aws.file_load_base
  ) {
    mainImageUrl = config.aws.file_load_base.replace(/\/$/, '') + mainImageUrl;
  }

  // 2. Image Validation: Check if image exists and has supported format
  if (!mainImageUrl) {
    console.warn(
      `⚠️ [Google Merchant] Skipping product with no image: ${product.product_title}`,
    );
    return { success: false, message: 'Missing product image' };
  }

  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const imageUrlLower = mainImageUrl.toLowerCase();
  const hasSupportedExtension = supportedExtensions.some((ext) =>
    imageUrlLower.endsWith(ext),
  );

  if (!hasSupportedExtension) {
    // If it's a webp image, we might try to see if there's a fallback or just skip
    if (imageUrlLower.endsWith('.webp') || imageUrlLower.endsWith('.avif')) {
      console.warn(
        `⚠️ [Google Merchant] Unsupported image format (webp/avif): ${mainImageUrl}`,
      );
      // Note: In a real scenario, we might want to serve a converted JPEG here.
    } else {
      console.warn(
        `⚠️ [Google Merchant] Potentially unsupported image format: ${mainImageUrl}`,
      );
    }
  }

  // 3. Domain Consistency: Ensure the link domain matches Merchant Center
  const verifiedDomain = 'https://shoppingcart.bd';
  const productLink = `${verifiedDomain}/products/${product.url_handle}`;

  try {
    const response = await content.products.insert({
      merchantId: MERCHANT_ID,
      requestBody: {
        offerId: product.sku || product._id.toString(),
        title: product.product_title,
        description: product.product_description,
        link: productLink,
        imageLink: mainImageUrl,
        contentLanguage: 'en',
        targetCountry: 'BD',
        channel: 'online',
        availability: product.quantity > 0 ? 'in stock' : 'out of stock',
        condition: 'new',
        brand: product.product_vendor || 'Tetulia',
        price: {
          value: (product.compare_at_price || product.product_price).toString(),
          currency: 'BDT',
        },
        salePrice:
          product.compare_at_price > product.product_price
            ? {
                value: product.product_price.toString(),
                currency: 'BDT',
              }
            : undefined,
      },
    });

    console.log(
      `✅ [Google Merchant] Synced: ${product.product_title} (${
        product.sku || product._id
      })`,
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Error syncing product to Google Merchant:', error.message);
    return { success: false, error: error.message };
  }
};

export const syncAllProductsToGoogleMerchant = async (products: any[]) => {
  const results = [];
  for (const product of products) {
    const result = await syncProductToGoogleMerchant(product);
    results.push({ id: product._id, ...result });
  }
  return results;
};

export const deleteProductFromGoogleMerchant = async (
  productId: string,
  sku?: string,
) => {
  if (!fs.existsSync(KEY_FILE_PATH)) return;

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/content'],
  });

  const client = await auth.getClient();
  const content = google.content({
    version: 'v2.1',
    auth: client as any,
  });

  const offerId = sku || productId;

  try {
    await content.products.delete({
      merchantId: MERCHANT_ID,
      productId: `online:en:BD:${offerId}`,
    });
    return { success: true };
  } catch (error: any) {
    console.error(
      'Error deleting product from Google Merchant:',
      error.message,
    );
    return { success: false, error: error.message };
  }
};
