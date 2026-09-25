import { Router } from 'express';
import {
  createDiscount,
  getDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  getActiveDiscounts,
} from './discount.controller';

const router = Router();

router.post('/', createDiscount);
router.get('/', getDiscounts);
router.get('/active', getActiveDiscounts);
router.get('/:id', getDiscountById);
router.patch('/:id', updateDiscount);
router.delete('/:id', deleteDiscount);

export const DiscountRoutes = router;
