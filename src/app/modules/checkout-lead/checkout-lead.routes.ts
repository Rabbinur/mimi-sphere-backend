import { Router } from 'express';
import { CheckoutLeadController } from './checkout-lead.controller';

const router = Router();

router.post('/', CheckoutLeadController.upsertCheckoutLead);
router.get('/', CheckoutLeadController.getCheckoutLeads);
router.post('/:id/follow-up', CheckoutLeadController.addFollowUpLog);

export const CheckoutLeadRoutes = router;
