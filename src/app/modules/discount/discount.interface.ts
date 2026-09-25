import { Types } from 'mongoose';

export interface IDiscount {
  _id?: string;
  name: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  discount_plan: string;
  valid_from: Date;
  valid_to: Date;
  days: string[];
  customer_group: string;
  apply_to: 'all' | 'specific';
  products: Types.ObjectId[];
  is_active: boolean;
  status?: 'Active' | 'Inactive' | 'Expired';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDiscountQuery {
  search?: string;
  status?: string;
  customer?: string;
  page?: number;
  limit?: number;
}
