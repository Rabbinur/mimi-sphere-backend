import { Schema, model } from 'mongoose';
import { TBlog, BlogModel } from './blog.interface';

const blogSchema = new Schema<TBlog>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    thumbnail: { type: String },
    category: { type: String },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

export const Blog = model<TBlog, BlogModel>('Blog', blogSchema);
