import { Types } from 'mongoose';

export interface TCartItemSnapshot {
  productId: Types.ObjectId;
  productName: string;
  sku?: string;
  image?: string;
  slug: string;
  price: number;
  discount?: number;
  quantity: number;
  variant?: any;
  storeId?: Types.ObjectId | null;
}

export interface TFollowUpLog {
  agentId?: Types.ObjectId;
  agentName: string;
  action: 'call' | 'whatsapp' | 'sms' | 'email';
  remarks?: string;
  contactedAt?: Date;
}

export interface TCheckoutLead {
  checkoutSessionId: string;
  userId?: Types.ObjectId | null;
  customerName?: string;
  phone?: string;
  email?: string;
  district?: string;
  upazila?: string;
  villageOrArea?: string;
  cartItems: TCartItemSnapshot[];
  totalPrice: number;
  status: 'draft' | 'pending' | 'converted' | 'abandoned' | 'expired';
  orderId?: Types.ObjectId | null;
  leadScore: number;
  followUpHistory: TFollowUpLog[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  fbclid?: string;
  gclid?: string;
  referer?: string;
  device?: string;
  browser?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  lastActivityAt: Date;
  expiresAt?: Date | null;
}
