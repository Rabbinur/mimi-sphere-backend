export interface CustomOrderInput {
  productName: string;
  productImageUrl?: string;
  productDescription?: string;
  purchaseUrl?: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export type CustomOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'canceled';
