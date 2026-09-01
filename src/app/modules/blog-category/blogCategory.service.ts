import { BlogCategory } from './blogCategory.model';
import { TBlogCategory } from './blogCategory.interface';

const createBlogCategoryIntoDB = async (payload: TBlogCategory) => {
  const result = await BlogCategory.create(payload);
  return result;
};

const getAllBlogCategoriesFromDB = async () => {
  const result = await BlogCategory.find();
  return result;
};

const deleteBlogCategoryFromDB = async (id: string) => {
  const result = await BlogCategory.findByIdAndDelete(id);
  return result;
};

export const BlogCategoryServices = {
  createBlogCategoryIntoDB,
  getAllBlogCategoriesFromDB,
  deleteBlogCategoryFromDB,
};
