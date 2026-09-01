import express from 'express';
import { ReviewControllers } from './review.controller';

const router = express.Router();

router.post('/', ReviewControllers.createReview);
router.get('/', ReviewControllers.getReviews);
router.get('/:identifier', ReviewControllers.getReviewsByProduct);
router.delete('/:id', ReviewControllers.deleteReview);
router.patch('/:id/status', ReviewControllers.updateReviewStatus);

export const ReviewRoutes = router;
