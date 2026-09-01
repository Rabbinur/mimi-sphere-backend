import express from 'express';
import { collectionController } from './collection.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';

const router = express.Router();

router.post(
  '/',
  verifyToken([UserRole.ADMIN]),
  collectionController.createCollection,
);

router.get('/', collectionController.getAllCollections);

router.get('/slug/:slug', collectionController.getCollectionBySlug);

router.get('/:id', collectionController.getCollectionById);

router.put(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  collectionController.updateCollection,
);

router.delete(
  '/:id',
  verifyToken([UserRole.ADMIN]),
  collectionController.deleteCollection,
);

export const CollectionRoutes = router;
