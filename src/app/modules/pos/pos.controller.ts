import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { HttpStatusCode } from '../../../lib/httpStatus';
import { posService } from './pos.service';

class PosController {
  getPosProducts = catchAsync(async (req: Request, res: Response) => {
    const { search, category_id, page, per_page } = req.query;

    const result = await posService.getPosProducts({
      search: search ? String(search) : undefined,
      category_id: category_id ? String(category_id) : undefined,
      page: page ? Number(page) : undefined,
      per_page: per_page ? Number(per_page) : undefined,
    });

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'POS products fetched successfully',
      data: result,
    });
  });

  scanBarcode = catchAsync(async (req: Request, res: Response) => {
    const { barcode } = req.query;

    const result = await posService.scanBarcode(String(barcode || ''));

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'Barcode scan result found',
      data: result,
    });
  });

  createPosOrder = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.createPosOrder(req.body);

    sendResponse(res, {
      statusCode: HttpStatusCode.CREATED,
      success: true,
      message: 'POS Order created successfully',
      data: result,
    });
  });

  getPosShiftSummary = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.getPosShiftSummary();

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'POS Shift summary fetched successfully',
      data: result,
    });
  });
}

export const posController = new PosController();

