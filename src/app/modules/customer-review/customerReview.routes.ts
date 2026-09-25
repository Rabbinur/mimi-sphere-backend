import express from 'express';
import { CustomerReviewControllers } from './customerReview.controller';

const router = express.Router();

router.post('/', CustomerReviewControllers.createCustomerReview);
router.get('/', CustomerReviewControllers.getAllCustomerReviews);
router.get('/:id', CustomerReviewControllers.getSingleCustomerReview);
router.patch('/:id', CustomerReviewControllers.updateCustomerReview);
router.delete('/:id', CustomerReviewControllers.deleteCustomerReview);

export const CustomerReviewRoutes = router;
