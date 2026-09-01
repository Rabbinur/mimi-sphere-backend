import { z } from 'zod';

export const fileValidationSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  size: z.number().nonnegative(),
  mimetype: z.string(),
  title: z.string(),
});
