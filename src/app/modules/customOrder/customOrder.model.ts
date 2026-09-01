import { Schema, model, models } from 'mongoose';
import { CustomOrderStatus } from './customOrder.interface';

export interface CustomOrderDocument {
  productName: string;
  productImageUrl?: string;
  productDescription?: string;
  purchaseUrl?: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  status: CustomOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CustomOrderSchema = new Schema<CustomOrderDocument>(
  {
    productName: { type: String, required: true, trim: true },
    productImageUrl: { type: String },
    productDescription: { type: String },
    purchaseUrl: { type: String },

    customerName: { type: String, required: true },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    customerPhone: { type: String, required: true },

    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'canceled'],
      default: 'pending',
    } as any,
  },
  { timestamps: true },
);

export const CustomOrder =
  models.CustomOrder ||
  model<CustomOrderDocument>('CustomOrder', CustomOrderSchema);
