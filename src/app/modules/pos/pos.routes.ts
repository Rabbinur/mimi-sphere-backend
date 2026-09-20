import express from 'express';
import { posController } from './pos.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();
const admin = verifyToken([UserRole.ADMIN]);

router.get('/products',               admin, posController.getPosProducts);
router.get('/scan',                   admin, posController.scanBarcode);
router.post('/orders',                admin, posController.createPosOrder);
router.get('/customer/:phone',        admin, posController.lookupCustomer);
router.get('/customer/:phone/history',admin, posController.getCustomerHistory);
router.get('/shift-summary',          admin, posController.getPosShiftSummary);
router.get('/today-profit',           admin, posController.getTodayProfit);
router.get('/last-receipt',           admin, posController.getLastReceipt);
router.get('/members',                admin, posController.getMembersList);
router.get('/orders-list',            admin, posController.getPosOrdersList);
router.get('/transactions',           admin, posController.getPosTransactions);
router.patch('/transactions/:id',     admin, posController.updatePosTransaction);
router.get('/membership-settings',    admin, posController.updateMembershipSettings);
router.put('/membership-settings',    admin, posController.updateMembershipSettings);
router.post('/expenses',              admin, posController.createPosExpense);
router.get('/expenses',               admin, posController.getPosExpenses);
router.delete('/expenses/:id',        admin, posController.deletePosExpense);

export const PosRoutes = router;
