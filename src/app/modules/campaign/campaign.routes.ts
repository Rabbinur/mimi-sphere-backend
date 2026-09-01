import express from 'express';
import verifyToken from '../../middlewares/verifyToken';
import validateRequest from '../../middlewares/validateRequest';
import { CampaignValidation } from './campaign.validation';
import { CampaignController } from './campaign.controller';

const router = express.Router();

router.get(
  '/',
  verifyToken(['ADMIN']),
  CampaignController.getAllCampaigns
);

router.get(
  '/preview',
  verifyToken(['ADMIN']),
  CampaignController.getRecipientPreview
);

// --- Templates ---
router.get(
    '/templates',
    verifyToken(['ADMIN']),
    CampaignController.getAllTemplates
);

// Public tracking route
router.get('/track/:campaignId/:email', CampaignController.trackEmailOpen);

router.post(
    '/templates',
    verifyToken(['ADMIN']),
    CampaignController.createTemplate
);

router.patch(
    '/templates/:id',
    verifyToken(['ADMIN']),
    CampaignController.updateTemplate
);

router.delete(
    '/templates/:id',
    verifyToken(['ADMIN']),
    CampaignController.deleteTemplate
);

// --- Campaigns ---
router.get(
  '/:id',
  verifyToken(['ADMIN']),
  CampaignController.getSingleCampaign
);

router.post(
  '/',
  verifyToken(['ADMIN']),
  validateRequest(CampaignValidation.createCampaignValidationSchema),
  CampaignController.createCampaign
);

router.patch(
  '/:id',
  verifyToken(['ADMIN']),
  validateRequest(CampaignValidation.updateCampaignValidationSchema),
  CampaignController.updateCampaign
);

router.delete(
  '/:id',
  verifyToken(['ADMIN']),
  CampaignController.deleteCampaign
);

router.post(
  '/:id/send',
  verifyToken(['ADMIN']),
  CampaignController.sendCampaign
);

export const CampaignRoutes = router;
