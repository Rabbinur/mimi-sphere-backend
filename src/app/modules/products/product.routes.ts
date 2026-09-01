import express from 'express';
import { ProductController } from './product.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post('/', ProductController.createProduct);
router.post(
  '/import-cj',
  verifyToken([UserRole.ADMIN]),
  ProductController.importCjProducts,
);
router.post(
  '/import-kcbazar',
  verifyToken([UserRole.ADMIN]),
  ProductController.scrapeProduct,
);
router.get('/sync/google-merchant', ProductController.syncToGoogleMerchant);
router.get('/filters', ProductController.getProductFilters);
router.get('/featured', ProductController.getFeaturedProducts);
router.get('/trendy', ProductController.getTrendyProducts);
router.get(
  '/admin',
  verifyToken([UserRole.ADMIN]),
  ProductController.getProductsForAdmin,
);
router.get('/slug/:slug', ProductController.getProductBySlug);
router.get('/by-category/:id', ProductController.getProductsByCategory);
router.get('/', ProductController.getAllProducts);
router.get('/:id', ProductController.getSingleProduct);

router.put(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  ProductController.updateProduct,
);
router.delete(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  ProductController.deleteProduct,
);

export const ProductRoutes = router;
