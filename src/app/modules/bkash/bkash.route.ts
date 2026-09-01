import express from 'express';
import { createBkashPayment, bkashCallback } from './bkash.controller';

const router = express.Router();

router.post('/create-payment', createBkashPayment);
router.get('/callback', bkashCallback);

export const BkashRoutes = router;
