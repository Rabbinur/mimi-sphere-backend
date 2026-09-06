import { Schema, model } from 'mongoose';
import { TOrder } from './order.interface';

/* -------- Product Schema -------- */
const OrderProductSchema = new Schema(
  {
    product_id: { type: String, required: true },
    variant_id: { type: String, default: null },

    title: { type: String, required: true, trim: true },
    thumbnail: { type: String, default: null },

    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },

    selected_variant_values: {
      type: Map,
      of: String,
      default: undefined,
    },

    total_price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/* -------- Order Schema -------- */
export const OrderSchema = new Schema<TOrder>(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customer_name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },

    village_or_area: { type: String, default: '', trim: true },
    upazila: {
      type: String,
      trim: true,
      required: true,
    },
    district: {
      type: String,
      trim: true,
      required: true,
    },

    delivery_zone: {
      type: String,
      enum: ['inside_dhaka', 'outside_dhaka'],
    },

    order_type: {
      type: String,
      enum: ['ONLINE', 'POS'],
      default: 'ONLINE',
    },

    products: {
      type: [OrderProductSchema],
      required: true,
      validate: {
        validator: (v: any[]) => v && v.length > 0,
        message: 'Order must contain at least one product',
      },
    },

    payment_method: {
      type: String,
      enum: ['COD', 'ONLINE', 'POS_CASH', 'POS_CARD', 'POS_BKASH', 'POS_NAGAD', 'POS_OTHER', 'cash', 'card', 'bkash', 'nagad', 'other'],
      required: true,
    },

    payment_status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    delivery_charge: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    online_payment_details: {
      provider: { type: String, trim: true },
      trx_id: { type: String, trim: true },
      proof: { type: String, trim: true },
    },
    order_status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'canceled',
        'returned',
        'failed_delivery',
        'out_for_delivery',
      ],
      default: 'pending',
    },

    notes: { type: String, default: '', trim: true },
    coupon: { type: String, default: null },
    discount_amount: { type: Number, default: 0 },

    courier_details: {
      consignment_id: { type: String, trim: true },
      tracking_code: { type: String, trim: true },
      status: { type: String, trim: true },
      courier_name: { type: String, trim: true },
    },

    total_price: { type: Number, required: true, min: 0 },

    tracking_data: {
      fbc: { type: String, trim: true },
      fbp: { type: String, trim: true },
      ip: { type: String, trim: true },
      user_agent: { type: String, trim: true },
      external_id: { type: String, trim: true },
    },
    is_purchase_event_fired: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const OrderModel = model<TOrder>('Order', OrderSchema);
export const SuccessOrderModel = model<TOrder>('SuccessOrder', OrderSchema);
