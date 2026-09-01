import { z } from 'zod';

/* -------- Product Validation -------- */
const orderProductSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),

  variant_id: z.string().nullable().optional(),

  title: z.string().min(1, 'Product title is required'),

  thumbnail: z.string().url().nullable().optional(),

  price: z.number().min(0, 'Price must be >= 0'),

  quantity: z.number().int().min(1, 'Quantity must be at least 1'),

  selected_variant_values: z.record(z.string()).optional(),

  total_price: z.number().min(0, 'Total price must be >= 0'),
});

/* -------- Order Validation -------- */
export const orderValidationSchema = z
  .object({
    /* -------- Customer -------- */
    customer_name: z.string().min(1, 'Customer name is required'),

    email: z.string().email('Invalid email address').optional(),

    phone: z.string().min(6, 'Phone number is required'),

    /* -------- Address -------- */
    village_or_area: z.string().optional(),

    upazila: z.string().min(1, 'Upazila is required'),

    district: z.string().min(1, 'District is required'),

    delivery_zone: z.enum(['inside_dhaka', 'outside_dhaka']).optional(),

    /* -------- Products -------- */
    products: z
      .array(orderProductSchema)
      .min(1, 'Order must contain at least one product'),

    /* -------- Payment -------- */
    payment_method: z.enum(['COD', 'ONLINE']).optional(),

    payment_status: z.enum(['pending', 'paid', 'failed']).optional(),

    delivery_charge: z.number().optional(),

    online_payment_details: z
      .object({
        provider: z.string().optional(),
        trx_id: z.string().optional(),
        proof: z.string().optional(),
      })
      .optional(),

    /* -------- Order -------- */
    order_status: z.enum([
      'pending',
      'processing',
      'shipped',
      'delivered',
      'canceled',
      'returned',
      'failed_delivery',
      'out_for_delivery',
    ]),

    notes: z.string().optional(),

    coupon: z.string().optional(),

    /* -------- Pricing -------- */
    total_price: z.number().min(0, 'Total price must be >= 0'),
  });
