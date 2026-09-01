import express from 'express';
import { AddressController } from './address.controller';

import verifyToken from '../../middlewares/verifyToken';

const router = express.Router();

router.post('/', verifyToken(), AddressController.createAddress);
router.get('/my-addresses', verifyToken(), AddressController.getUserAddresses);
router.patch('/:id', verifyToken(), AddressController.updateAddress);
router.delete('/:id', verifyToken(), AddressController.deleteAddress);

export const AddressRoutes = router;
