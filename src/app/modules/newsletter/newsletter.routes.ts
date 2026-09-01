import express from 'express';
import { NewsletterController } from './newsletter.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post('/', NewsletterController.subscribe);
router.get(
  '/',
  verifyToken([UserRole.ADMIN]),
  NewsletterController.getSubscribers,
);

export const NewsletterRoutes = router;
