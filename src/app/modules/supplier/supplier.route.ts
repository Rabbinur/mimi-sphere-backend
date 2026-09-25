import express from 'express';
import { supplierController } from './supplier.controller';

const router = express.Router();

router.post('/', supplierController.createSupplier);
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.patch('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

// Specialized route for adding payment history
router.post('/:id/payments', supplierController.addPayment);

export const supplierRoutes = router;
