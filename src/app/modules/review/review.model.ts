import { Schema, model } from 'mongoose';
import { TReview } from './review.interface';

const ReviewSchema = new Schema<TReview>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    reviewer_name: {
      type: String,
      trim: true,
    },
    reviewer_image: {
      type: String,
      trim: true,
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    product_slug: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    is_verified_purchase: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // Auto-approve for now or set to pending based on preference
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for fast lookup by product ID or Slug
ReviewSchema.index({ product_id: 1, status: 1 });
ReviewSchema.index({ product_slug: 1, status: 1 });
ReviewSchema.index({ user_id: 1 });

export const Review = model<TReview>('Review', ReviewSchema);
