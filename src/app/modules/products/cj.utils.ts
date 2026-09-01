import axios from 'axios';
import config from '../../config';
import { AppError } from '../../utils/errorHandler';

export const cjClient = axios.create({
  baseURL: 'https://developers.cjdropshipping.com/api2.0/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export const getAccessToken = async (): Promise<string> => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await cjClient.post('/authentication/getAccessToken', {
      apiKey: config.cj_api_key,
    });

    const token = response.data?.data?.accessToken;
    if (!token) throw new Error('CJ Token Error: No token in response');

    cachedToken = token;
    tokenExpiry = Date.now() + 55 * 60 * 1000;
    return token;
  } catch (error: any) {
    console.error('❌ CJ Auth Error:', error.response?.data || error.message);
    throw new AppError(
      'CJ Auth Failed: Please check your CJ_API_KEY in .env',
      401,
    );
  }
};

export interface ICjProduct {
  pid: string;
  productNameEn: string;
  productSku: string;
  sellPrice: number;
  productImageSet: string[];
  productImage: string;
  description?: string;
  categoryName?: string;
  productWeight?: number;
  productUnit?: string;
  supplierName?: string;
  variants?: Array<{
    vid: string;
    variantNameEn: string;
    variantSku: string;
    variantSellPrice: number;
    variantWeight: number;
    inventories: number;
    variantImage: string;
    variantKey?: string;
    variantProperty?: string;
  }>;
}

export class CjUtils {
  static async fetchProducts(
    keyword: string = 'hoodie',
    page: number = 1,
    size: number = 20,
  ): Promise<any[]> {
    try {
      const token = await getAccessToken();

      const response = await cjClient.get('/product/listV2', {
        params: { page, size, keyWord: keyword, sort: 'desc', orderBy: '0' },
        headers: { 'CJ-Access-Token': token },
      });

      if (response.data?.code !== 200) {
        throw new AppError(
          `CJ API Error: ${response.data?.message || 'Unknown error'}`,
          response.data?.code || 500,
        );
      }

      const content = response.data?.data?.content || [];
      let allProducts: any[] = [];

      if (Array.isArray(content) && content.length > 0) {
        content.forEach((item) => {
          if (item.productList && Array.isArray(item.productList)) {
            allProducts = [...allProducts, ...item.productList];
          }
        });
      }
      return allProducts;
    } catch (error: any) {
      console.error('❌ CJ Fetch Products Error:', error.response?.data || error.message);
      throw new AppError(
        error.response?.data?.message || error.message || 'Failed to fetch products from CJ',
        error.response?.status || 500,
      );
    }
  }

  static async fetchProductDetail(productId: string): Promise<ICjProduct | null> {
    try {
      const token = await getAccessToken();

      const response = await cjClient.get('/product/query', {
        params: { pid: productId },
        headers: { 'CJ-Access-Token': token },
      });

      if (response.data?.code === 200 && response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error: any) {
      console.error('❌ CJ Fetch Product Detail Error:', error.response?.data || error.message);
      return null;
    }
  }
}
