import express from 'express';
import { BlogCategoryController } from './blogCategory.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post(
  '/',
  verifyToken([UserRole.ADMIN]),
  BlogCategoryController.createBlogCategory,
);
router.get('/', BlogCategoryController.getAllBlogCategories);
router.delete(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  BlogCategoryController.deleteBlogCategory,
);

export const BlogCategoryRoutes = router;
