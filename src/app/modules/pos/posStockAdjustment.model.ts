import { Schema, model, Document } from 'mongoose';

export interface IPosStockAdjustment extends Document {
  product_id?: string;
  product_title?: string;
  adjustment_type: 'increase' | 'decrease' | 'damaged' | 'lost' | 'correction';
  quantity: number;
  cost_value: number;
  reason?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const posStockAdjustmentSchema = new Schema<IPosStockAdjustment>(
  {
    product_id: { type: String, default: null },
    product_title: { type: String, default: '' },
    adjustment_type: {
      type: String,
      enum: ['increase', 'decrease', 'damaged', 'lost', 'correction'],
      default: 'correction',
    },
    quantity: { type: Number, default: 0 },
    cost_value: { type: Number, default: 0 },
    reason: { type: String, default: '', trim: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PosStockAdjustment = model<IPosStockAdjustment>(
  'PosStockAdjustment',
  posStockAdjustmentSchema
);
