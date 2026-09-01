import express from 'express';
import { BlogController } from './blog.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post(
  '/',
  verifyToken([UserRole.ADMIN]),
  BlogController.createBlog,
);
router.get('/', BlogController.getAllBlogs);
router.get(
  '/admin',
  verifyToken([UserRole.ADMIN]),
  BlogController.getBlogsForAdmin,
);
router.get('/:slug', BlogController.getSingleBlog);
router.get(
  '/id/:id',
  verifyToken([UserRole.ADMIN]),
  BlogController.getBlogById,
);
router.put(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  BlogController.updateBlog,
);
router.delete(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  BlogController.deleteBlog,
);

export const BlogRoutes = router;
