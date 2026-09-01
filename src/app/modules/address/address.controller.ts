import { Request, Response } from 'express';
import { AddressService } from './address.service';
import BaseController from '../../shared/baseController';

class Controller extends BaseController {
  createAddress = this.catchAsync(async (req: Request, res: Response) => {
    const data = await AddressService.createAddress(req.user.id, req.body);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Address created successfully',
      data: data,
    });
  });

  getUserAddresses = this.catchAsync(async (req: Request, res: Response) => {
    const data = await AddressService.getUserAddresses(req.user.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Addresses fetched successfully',
      data: data,
    });
  });

  updateAddress = this.catchAsync(async (req: Request, res: Response) => {
    const data = await AddressService.updateAddress(req.params.id, req.user.id, req.body);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Address updated successfully',
      data: data,
    });
  });

  deleteAddress = this.catchAsync(async (req: Request, res: Response) => {
    const data = await AddressService.deleteAddress(req.params.id, req.user.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Address deleted successfully',
      data: data,
    });
  });
}

export const AddressController = new Controller();
