// modules/ekpay/ekpay.route.ts
import express from 'express';
import { initiatePaymentHandler } from './ekpay.controller';

const router = express.Router();

router.post('/initiate', initiatePaymentHandler);

export const ekpayRoutes = router;