import express from 'express';
import { ContactController } from './contact.controller';

const router = express.Router();

router.post('/submit', ContactController.submitContact);

export const ContactRoutes = router;
