import { z } from 'zod';

const cartItemSchema = z.object({
  product: z.string({
    required_error: 'Product ID is required',
  }),
  variantId: z.string({
    required_error: 'Variant ID is required',
  }),
  quantity: z.number({
    required_error: 'Quantity is required',
  }).min(1, 'Quantity must be at least 1'),
  price: z.number({
    required_error: 'Price is required',
  }),
});

const addToCartValidationSchema = z.object({
  body: z.object({
    item: cartItemSchema,
  }),
});

const updateCartItemValidationSchema = z.object({
  body: z.object({
    product: z.string(),
    variantId: z.string(),
    quantity: z.number().min(0),
  }),
});

const syncCartValidationSchema = z.object({
  body: z.object({
    items: z.array(cartItemSchema),
  }),
});

export const CartValidation = {
  addToCartValidationSchema,
  updateCartItemValidationSchema,
  syncCartValidationSchema,
};
