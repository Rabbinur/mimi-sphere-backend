export interface IPosProductItem {
  product_id: string;
  variant_id?: string;
  product_name: string;
  combination_label?: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  image?: string;
  category_id?: string;
  has_variants: boolean;
  variants_count?: number;
  variants?: Array<{
    variant_id: string;
    combination_label: string;
    sku?: string;
    barcode?: string;
    price: number;
    cost_price?: number;
    stock_quantity: number;
    image?: string;
  }>;
}

export interface IPosCartItem {
  product_id: string;
  variant_id?: string;
  product_name: string;
  combination_label?: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  quantity: number;
  total: number;
  image?: string;
}

export interface IPosOrderPayload {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  items: IPosCartItem[];
  subtotal: number;
  discount?: number;
  coupon_code?: string;
  tax?: number;
  total: number;
  payment_method: 'cash' | 'card' | 'bkash' | 'nagad' | 'other';
  tendered_amount?: number;
  change_amount?: number;
  note?: string;
}
