import express from 'express';
import { categoryController } from './category.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post(
  '/',
  verifyToken([UserRole.ADMIN]),
  categoryController.createCategory,
);
router.put(
  '/reorder',
  verifyToken([UserRole.ADMIN]),
  categoryController.updateCategoryOrder,
);
router.get('/:id', categoryController.getCategoryById);
router.get('/', categoryController.getAllCategories);
router.put(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  categoryController.updateCategory,
);
router.delete(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  categoryController.deleteCategory,
);

export const CategoryRoutes = router;
