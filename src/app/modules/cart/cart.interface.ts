import { Types } from 'mongoose';

export interface ICartItem {
  product: Types.ObjectId;
  variantId: Types.ObjectId | string;
  quantity: number;
  price: number;
}

export interface ICart {
  user: Types.ObjectId;
  items: ICartItem[];
}
