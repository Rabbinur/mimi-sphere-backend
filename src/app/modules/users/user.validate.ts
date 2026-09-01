import { z as Zod } from 'zod';

const createZodSchema = Zod.object({
  body: Zod.object({
    name: Zod.string({
      required_error: 'Full Name is required',
      invalid_type_error: 'Full Name must be string',
    }),
    password: Zod.string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be string',
    }),
    email: Zod.string({
      required_error: 'Email is required',
    }).email('Please provide a valid email'),
    phone: Zod.string({
      invalid_type_error: 'Valid Phone Number must be string',
    }).optional(),
  }),
});

export const UserValidationSchema = {
  createZodSchema,
};
