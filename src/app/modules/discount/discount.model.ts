import { Schema, model } from 'mongoose';
import { IDiscount } from './discount.interface';

const discountSchema = new Schema<IDiscount>(
  {
    name: { type: String, required: true, trim: true, index: true },
    discount_type: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
      required: true,
    },
    discount_value: { type: Number, required: true },
    discount_plan: { type: String, default: 'Standard' },
    valid_from: { type: Date, required: true },
    valid_to: { type: Date, required: true },
    days: {
      type: [String],
      default: ['All Days'],
    },
    customer_group: { type: String, default: 'All' },
    apply_to: {
      type: String,
      enum: ['all', 'specific'],
      default: 'all',
      required: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    is_active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Expired'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

discountSchema.pre('save', function (next) {
  const now = new Date();
  if (this.valid_to && new Date(this.valid_to) < now) {
    this.status = 'Expired';
    this.is_active = false;
  } else if (this.is_active === false) {
    this.status = 'Inactive';
  } else {
    this.status = 'Active';
  }
  next();
});

const DiscountModel = model<IDiscount>('Discount', discountSchema);

export default DiscountModel;
