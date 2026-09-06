export type TOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'returned'
  | 'failed_delivery'
  | 'out_for_delivery';
export type TOrderProduct = {
  product_id: string;
  variant_id?: string | null;

  title: string;
  thumbnail?: string | null;

  price: number;
  quantity: number;

  selected_variant_values?: Record<string, string>;
  total_price: number;
};

export type TOrder = {
  order_id: string;

  /* -------- Customer -------- */
  customer_name: string;
  email?: string;
  phone: string;

  /* -------- Address -------- */
  village_or_area?: string;
  upazila: string;
  district: string;
  delivery_zone?: 'inside_dhaka' | 'outside_dhaka';
  /* -------- Products -------- */
  products: TOrderProduct[];

  order_type?: 'ONLINE' | 'POS';

  /* -------- Payment -------- */
  payment_method: 'COD' | 'ONLINE' | 'POS_CASH' | 'POS_CARD' | 'POS_BKASH' | 'POS_NAGAD' | 'POS_OTHER' | string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  delivery_charge: number;

  online_payment_details?: {
    provider?: string;
    trx_id?: string;
    proof?: string;
  };

  /* -------- Order -------- */
  order_status: TOrderStatus;

  notes?: string;
  coupon?: string;
  discount_amount?: number;

  /* -------- Courier -------- */
  courier_details?: {
    consignment_id?: string;
    tracking_code?: string;
    status?: string;
    courier_name?: string;
  };

  /* -------- Pricing -------- */
  total_price: number;

  /* -------- Tracking -------- */
  tracking_data?: {
    fbc?: string;
    fbp?: string;
    ip?: string;
    user_agent?: string;
    external_id?: string;
  };
  is_purchase_event_fired?: boolean;
};
