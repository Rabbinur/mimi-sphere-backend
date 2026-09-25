import { Schema, model, Document } from 'mongoose';

export type TMembershipTier = 'Regular' | 'Silver' | 'Gold';

export interface IPosCustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  total_spent: number;
  total_orders: number;
  membership_tier: TMembershipTier;
  discount_percent: number;
  last_purchase_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const posCustomerSchema = new Schema<IPosCustomer>(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      default: 'Walk-in Customer',
    },
    phone: {
      type: String,
      required: [true, 'Customer phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    total_spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_orders: {
      type: Number,
      default: 0,
      min: 0,
    },
    membership_tier: {
      type: String,
      enum: ['Regular', 'Silver', 'Gold'],
      default: 'Regular',
    },
    discount_percent: {
      type: Number,
      default: 0,
    },
    last_purchase_at: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

/**
 * Helper to compute membership tier and discount percentage based on cumulative lifetime spent.
 * Silver: ৳1,000+ -> 5% discount
 * Gold: ৳3,500+ -> 7% discount
 */
export const calculateMembership = (totalSpent: number): { tier: TMembershipTier; discountPercent: number } => {
  if (totalSpent >= 3500) {
    return { tier: 'Gold', discountPercent: 7 };
  }
  if (totalSpent >= 1000) {
    return { tier: 'Silver', discountPercent: 5 };
  }
  return { tier: 'Regular', discountPercent: 0 };
};

export const PosCustomer = model<IPosCustomer>('PosCustomer', posCustomerSchema);
