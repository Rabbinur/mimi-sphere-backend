import { z } from 'zod';

export const productValidationSchema = z.object({
  product_title: z.string().min(1, 'Product title is required'),

  product_description: z.string().min(1, 'Product description is required'),

  url_handle: z.string().optional(),

  thumbnail: z.string().url().optional(),

  product_images: z.array(z.string().url()).optional(),

  product_price: z.number().positive('Product price must be greater than 0'),

  compare_at_price: z.number().optional(),

  discount_percentage: z.number().min(0).max(100).optional(),

  sku: z.string().optional(),

  quantity: z.number().int().min(0, 'Quantity cannot be negative'),

  moq: z.number().int().min(1, 'MOQ must be at least 1').default(1),

  country_of_origin: z.string().optional(),

  delivery_charge: z
    .object({
      inside_dhaka: z.number().optional(),
      outside_dhaka: z.number().optional(),
    })
    .optional(),

  product_categories: z.array(z.string().min(1)).min(1, 'At least one category is required'),

  product_vendor: z.string().optional(),
  product_status: z.enum(['draft', 'active']).optional(),

  is_featured: z.boolean().optional(),
  is_trendy: z.boolean().optional(),
  is_limited_time_offer: z.boolean().optional(),
  is_pre_order: z.boolean().optional(),
  pre_order_message: z.string().optional(),
  is_free_delivery: z.boolean().optional(),

  product_attributes: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),

  product_options: z
    .array(
      z.object({
        option_name: z.string(),
        option_values: z.array(z.string()),
      }),
    )
    .optional(),

  product_variants: z
    .array(
      z.object({
        variant_option_values: z.record(z.string()),
        variant_price: z.number().positive(),
        variant_quantity: z.number().int().min(0).optional(),
        compare_at_price: z.number().optional(),
        image: z.string().optional(),
      }),
    )
    .optional(),
});

export const updateProductValidationSchema = productValidationSchema.partial();
