// import { TCouponValidation } from './coupon.interface';
// import CouponModel from './coupon.model';

// const validateCoupon = async (code: string, orderAmount: number, userId?: string): Promise<TCouponValidation> => {
//     const coupon = await CouponModel.findOne({ code, is_active: true });
//     if (!coupon) {
//         return { is_valid: false, message: 'Invalid or expired coupon code' };
//     }

//     if (new Date() < coupon.start_date || new Date() > coupon.end_date) {
//         return { is_valid: false, message: 'Coupon is not valid at this time' };
//     }

//     if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
//         return { is_valid: false, message: 'Coupon usage limit reached' };
//     }

//     if (coupon.minimum_order_amount && orderAmount < coupon.minimum_order_amount) {
//         return { is_valid: false, message: `Minimum order amount of ${coupon.minimum_order_amount} required` };
//     }

//     if (userId) {
//         if (coupon.valid_for_users?.length && !coupon.valid_for_users.includes(userId)) {
//             return { is_valid: false, message: 'Coupon is not valid for this user' };
//         }
//         if (coupon.invalid_for_users?.includes(userId)) {
//             return { is_valid: false, message: 'Coupon is restricted for this user' };
//         }
//     }

//     let discountAmount = 0;
//     if (coupon.discount_type === 'percentage') {
//         discountAmount = (orderAmount * coupon.discount_value) / 100;
//     } else if (coupon.discount_type === 'fixedAmount') {
//         discountAmount = coupon.discount_value;
//     }

//     return { is_valid: true, discount_amount: discountAmount };
// };

// export { validateCoupon };

import Joi from 'joi';

const couponSchema = Joi.object({
    code: Joi.string().required().uppercase().trim().messages({
        'string.empty': 'Coupon code is required.',
    }),
    discount_type: Joi.string().valid('percentage', 'fixedAmount', 'freeShipping').required().messages({
        'any.required': 'Discount type is required.',
        'any.only': 'Invalid discount type.',
    }),
    discount_value: Joi.number().required().min(0).messages({
        'number.base': 'Discount value must be a number.',
        'number.min': 'Discount value must be at least 0.',
        'any.required': 'Discount value is required.',
    }),
    start_date: Joi.date().required().messages({
        'date.base': 'Start date must be a valid date.',
        'any.required': 'Start date is required.',
    }),
    end_date: Joi.date().greater(Joi.ref('start_date')).required().messages({
        'date.base': 'End date must be a valid date.',
        'date.greater': 'End date must be after start date.',
        'any.required': 'End date is required.',
    }),
    usage_limit: Joi.number().integer().min(1).allow(null).messages({
        'number.integer': 'Usage limit must be an integer.',
        'number.min': 'Usage limit must be at least 1.',
    }),
    minimum_order_amount: Joi.number().min(0).optional().allow(null).messages({
        'number.min': 'Minimum order amount must be at least 0.',
    }),
    max_discount_amount: Joi.number().min(0).optional().allow(null).messages({
        'number.min': 'Maximum discount amount must be at least 0.',
    }),
    valid_for_products: Joi.array().items(Joi.string()).optional(),
    invalid_for_products: Joi.array().items(Joi.string()).optional(),
    valid_for_categories: Joi.array().items(Joi.string()).optional(),
    invalid_for_categories: Joi.array().items(Joi.string()).optional(),
    valid_for_users: Joi.array().items(Joi.string()).optional(),
    invalid_for_users: Joi.array().items(Joi.string()).optional(),
    is_active: Joi.boolean().default(true),
});

export default couponSchema;