import { model, Schema } from 'mongoose';
import { TCustomerReview } from './customerReview.interface';

const customerReviewSchema = new Schema<TCustomerReview>(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
      default: 5,
    },
    review: {
      type: String,
      required: [true, 'Review content is required'],
      trim: true,
    },
    tag: {
      type: String,
      default: 'Verified Buyer',
      trim: true,
    },
    is_verified: {
      type: Boolean,
      default: true,
    },
    is_featured: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

customerReviewSchema.index({ status: 1, order: 1, createdAt: -1 });

export const CustomerReview = model<TCustomerReview>(
  'CustomerReview',
  customerReviewSchema
);
