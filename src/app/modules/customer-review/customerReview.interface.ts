export interface TCustomerReview {
  name: string;
  image?: string;
  rating: number;
  review: string;
  tag?: string;
  is_verified?: boolean;
  is_featured?: boolean;
  status: 'active' | 'inactive';
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
