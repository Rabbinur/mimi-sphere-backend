import { Model } from 'mongoose';

export type TBlog = {
  title: string;
  slug: string;
  content: string;
  author: string;
  thumbnail?: string;
  category?: string;
  isPublished: boolean;
};

export type BlogModel = Model<TBlog>;
