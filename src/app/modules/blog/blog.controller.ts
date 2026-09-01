import { Request, Response } from 'express';
import { BlogServices } from './blog.service';
import { catchAsync } from '../../utils/catchAsync';
import { paginate } from '../../utils/pagination';
import { Blog } from './blog.model';

const createBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.createBlogIntoDB(req.body);
  res.status(201).json({
    success: true,
    message: 'Blog created successfully',
    data: result,
  });
});

const getAllBlogs = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const result = await paginate(Blog, { isPublished: true }, page, limit);
  res.status(200).json({
    success: true,
    message: 'Blogs fetched successfully',
    ...result,
  });
});

const getSingleBlog = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await BlogServices.getSingleBlogFromDB(slug);
  res.status(200).json({
    success: true,
    message: 'Blog fetched successfully',
    data: result,
  });
});

const getBlogsForAdmin = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string;

  const filter: any = {};
  if (category) {
    filter.category = category;
  }

  // Admin sees all blogs, including unpublished ones
  const result = await paginate(Blog, filter, page, limit);
  res.status(200).json({
    success: true,
    message: 'Blogs (admin) fetched successfully',
    ...result,
  });
});

const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BlogServices.updateBlogInDB(id, req.body);
  res.status(200).json({
    success: true,
    message: 'Blog updated successfully',
    data: result,
  });
});

const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await BlogServices.deleteBlogFromDB(id);
  res.status(200).json({
    success: true,
    message: 'Blog deleted successfully',
    data: null,
  });
});

const getBlogById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  // We'll reuse the model call but search by ID
  const result = await Blog.findById(id);
  res.status(200).json({
    success: true,
    message: 'Blog fetched successfully',
    data: result,
  });
});

export const BlogController = {
  createBlog,
  getAllBlogs,
  getSingleBlog,
  getBlogsForAdmin,
  updateBlog,
  deleteBlog,
  getBlogById,
};
