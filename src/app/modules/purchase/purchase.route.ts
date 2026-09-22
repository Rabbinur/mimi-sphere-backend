import express from 'express';
import { purchaseController } from './purchase.controller';

const router = express.Router();

router.post('/', purchaseController.createPurchase);
router.get('/', purchaseController.getAllPurchases);
router.get('/:id', purchaseController.getPurchaseById);
router.patch('/:id', purchaseController.updatePurchase);
router.delete('/:id', purchaseController.deletePurchase);

export const purchaseRoutes = router;
