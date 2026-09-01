import { Schema, model } from 'mongoose';
import { TCoupon } from './coupon.interface';

const couponSchema = new Schema<TCoupon>({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discount_type: { type: String, enum: ["percentage", "fixedAmount", "freeShipping"], required: true },
    discount_value: { type: Number, required: true },
    max_discount_amount: { type: Number, default: 0 },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    usage_limit: { type: Number, default: 1 },
    usage_count: { type: Number, default: 0 },
    minimum_order_amount: { type: Number, default: 50 },
    is_active: { type: Boolean, default: true },
}, { timestamps: true });

const CouponModel = model<TCoupon>('Coupon', couponSchema);

export default CouponModel;
