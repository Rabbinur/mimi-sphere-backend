import express from 'express';
import { posController } from './pos.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();
const posAccess = verifyToken([UserRole.ADMIN, UserRole.CASHIER]);
const adminOnly = verifyToken([UserRole.ADMIN]);

router.get('/products',               posAccess, posController.getPosProducts);
router.get('/scan',                   posAccess, posController.scanBarcode);
router.post('/orders',                posAccess, posController.createPosOrder);
router.get('/customer/:phone',        posAccess, posController.lookupCustomer);
router.get('/customer/:phone/history',posAccess, posController.getCustomerHistory);
router.get('/shift-summary',          posAccess, posController.getPosShiftSummary);
router.get('/cashier-shift-summary',  posAccess, posController.getCashierShiftSummary);
router.get('/cashier-reports',        adminOnly, posController.getCashierReports);
router.get('/today-profit',           adminOnly, posController.getTodayProfit);
router.get('/last-receipt',           posAccess, posController.getLastReceipt);
router.get('/members',                posAccess, posController.getMembersList);
router.get('/orders-list',            posAccess, posController.getPosOrdersList);
router.get('/transactions',           posAccess, posController.getPosTransactions);
router.patch('/transactions/:id',     posAccess, posController.updatePosTransaction);
router.get('/membership-settings',    adminOnly, posController.updateMembershipSettings);
router.put('/membership-settings',    adminOnly, posController.updateMembershipSettings);
router.post('/expenses',              posAccess, posController.createPosExpense);
router.get('/expenses',               posAccess, posController.getPosExpenses);
router.delete('/expenses/:id',        adminOnly, posController.deletePosExpense);
router.post('/sync-offline-orders',   posAccess, posController.syncOfflineOrders);
router.post('/sync-offline-expenses', posAccess, posController.syncOfflineExpenses);

export const PosRoutes = router;

