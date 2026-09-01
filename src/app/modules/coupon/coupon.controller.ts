
import { Request, Response } from 'express';
import { CouponServices } from './coupon.services';
import couponSchema from './coupon.validation';
import { Product } from '../products/product.model';

const createCoupon = async (req: Request, res: Response) => {
    try {
        const { error, value } = couponSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const coupon = await CouponServices.create(value);
        res.status(201).json({ message: 'Coupon created successfully', data: coupon });

    } catch (error: any) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ message: 'Failed to create coupon', error: error.message });
    }
};

const getCoupons = async (_req: Request, res: Response) => {
    try {
        const coupons = await CouponServices.getAll();
        res.status(200).json({ data: coupons });

    } catch (error: any) {
        console.error('Error getting coupons:', error);
        res.status(500).json({ message: 'Failed to get coupons', error: error.message });
    }
};

const getCouponById = async (req: Request, res: Response) => {
    try {
        const coupon = await CouponServices.getById(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        res.status(200).json({ data: coupon });

    } catch (error: any) {
        console.error('Error getting coupon by ID:', error);
        res.status(500).json({ message: 'Failed to get coupon', error: error.message });
    }
};

const updateCoupon = async (req: Request, res: Response) => {
    try {
        const { error, value } = couponSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const coupon = await CouponServices.update(req.params.id, value);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        res.status(200).json({ message: 'Coupon updated successfully', data: coupon });

    } catch (error: any) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ message: 'Failed to update coupon', error: error.message });
    }
};

const deleteCoupon = async (req: Request, res: Response) => {
    try {
        const coupon = await CouponServices.remove(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        res.status(200).json({ message: 'Coupon deleted successfully' });

    } catch (error: any) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ message: 'Failed to delete coupon', error: error.message });
    }
};

const applyCoupon = async (req: Request, res: Response) => {
    try {
        const { couponCode } = req.body;
        const productsData = req.body.products;

        if (!couponCode || !productsData || !Array.isArray(productsData) || productsData.length === 0) {
            return res.status(400).json({ success: false, message: 'Coupon code and products are required' });
        }
        const coupon = await CouponServices.getCouponByCode(couponCode);
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid coupon code' });
        }

        if (!coupon.is_active || coupon.start_date > new Date() || coupon.end_date < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon is not active or has expired' });
        }

        if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }

        let subtotal = 0;
        let discountedPrice = 0;

        for (const productData of productsData) {
            const product = await Product.findById(productData.product_id);
            if (!product) {
                return res.status(400).json({ success: false, message: `Product with ID ${productData.product_id} not found` });
            }
            subtotal += product.product_price * productData.quantity;
        }
        if (coupon.minimum_order_amount !== null && subtotal < coupon.minimum_order_amount) {
            return res.status(400).json({ success: false, message: `Minimum order amount is ${coupon.minimum_order_amount}` });
        }
        // Apply Discount
        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
            discountAmount = (subtotal * coupon.discount_value) / 100;

            // Apply Max Amount Cap
            if (coupon.max_discount_amount && coupon.max_discount_amount > 0) {
                if (discountAmount > coupon.max_discount_amount) {
                    discountAmount = coupon.max_discount_amount;
                }
            }
        } else if (coupon.discount_type === 'fixedAmount') {
            discountAmount = coupon.discount_value;
        } else if (coupon.discount_type === 'freeShipping') {
            discountAmount = subtotal;
        }
        discountedPrice = subtotal - discountAmount;
        const responseData = {
            success: true,
            message: 'Coupon applied successfully',
            subtotal: subtotal,
            discountAmount: discountAmount,
            discountedPrice: discountedPrice,
            couponCode: coupon.code,
        };
        res.status(200).json(responseData);

    } catch (error: any) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Failed to apply coupon', error: error.message });
    }
};





export const CouponController = {
    createCoupon,
    getCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    applyCoupon
};
