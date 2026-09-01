import { Schema, model } from 'mongoose';
import { TBlogCategory } from './blogCategory.interface';

const blogCategorySchema = new Schema<TBlogCategory>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

export const BlogCategory = model<TBlogCategory>('BlogCategory', blogCategorySchema);
