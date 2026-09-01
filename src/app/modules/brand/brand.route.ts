import express from 'express';
import { brandController } from './brand.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post(
  '/sync-from-products',
  verifyToken([UserRole.ADMIN]),
  brandController.syncBrandsFromProducts,
);

router.post(
  '/create-brand',
  verifyToken([UserRole.ADMIN]),
  brandController.createBrand,
);

router.get('/', brandController.getAllBrands);

router.get('/slug/:slug', brandController.getBrandBySlug);

router.get('/:id', brandController.getBrandById);

router.patch(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  brandController.updateBrand,
);

router.delete(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  brandController.deleteBrand,
);

router.post(
  '/update-order',
  verifyToken([UserRole.ADMIN]),
  brandController.updateBrandOrder,
);

export const BrandRoutes = router;
