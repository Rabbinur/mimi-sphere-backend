import { Types } from 'mongoose';

export interface TProduct {
  _id?: Types.ObjectId | string;

  product_title: string;
  product_description: string;
  url_handle?: string;

  thumbnail?: string;
  product_images?: string[];

  product_price: number;
  compare_at_price?: number;
  cost_price?: number;
  barcode?: string;

  discount_percentage?: number;

  sku?: string;
  quantity: number;
  moq: number; // Minimum Order Quantity

  is_free_delivery?: boolean;

  country_of_origin?: string;
  delivery_charge?: {
    inside_dhaka?: number;
    outside_dhaka?: number;
  };

  product_categories: Types.ObjectId[];

  product_vendor?: string;
  product_status?: 'draft' | 'active';

  // Rating and Reviews
  average_rating?: number;
  total_reviews?: number;

  is_featured?: boolean;
  is_trendy?: boolean;
  is_limited_time_offer?: boolean;

  product_attributes?: {
    label: string;
    value: string;
  }[];

  product_options?: {
    option_name: string;
    option_values: string[];
  }[];

  product_variants?: {
    variant_option_values: Map<string, string> | Record<string, string>;
    variant_price: number;
    cost_price?: number;
    variant_quantity?: number;
    compare_at_price?: number;
    sku?: string;
    barcode?: string;
    image?: string;
  }[];

  createdAt?: Date;
  updatedAt?: Date;

  is_pre_order?: boolean;
  pre_order_message?: string;
}
