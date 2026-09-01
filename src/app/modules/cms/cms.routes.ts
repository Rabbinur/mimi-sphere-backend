import express from 'express';
import CMSController from './cms.controller';

const router = express.Router();

router.get('/', CMSController.get);
router.put('/', CMSController.update);

export const CMSRoutes = router;
