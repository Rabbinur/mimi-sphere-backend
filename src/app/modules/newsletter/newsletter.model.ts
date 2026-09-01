import { Schema, model } from 'mongoose';
import { TNewsletter } from './newsletter.interface';

const newsletterSchema = new Schema<TNewsletter>(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

export const Newsletter = model<TNewsletter>('Newsletter', newsletterSchema);
