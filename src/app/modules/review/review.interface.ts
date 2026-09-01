import { Types } from 'mongoose';

export interface TReview {
  user_id?: Types.ObjectId;
  reviewer_name?: string;
  reviewer_image?: string;
  product_id: Types.ObjectId;
  product_slug: string;
  rating: number;
  comment: string;
  is_verified_purchase?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}
