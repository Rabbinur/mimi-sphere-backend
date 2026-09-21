import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { HttpStatusCode } from 'axios';
import { reportsService } from './reports.service';

class ReportsController {
  getProfitLossReport = catchAsync(async (req: Request, res: Response) => {
    const { startDate, endDate, channel } = req.query;
    const result = await reportsService.getProfitLossReport({
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      channel: channel ? (String(channel).toLowerCase() as any) : 'all',
    });

    sendResponse(res, {
      statusCode: HttpStatusCode.Ok,
      success: true,
      message: 'Financial profit and loss report generated successfully',
      data: result,
    });
  });

  getProductSalesReport = catchAsync(async (req: Request, res: Response) => {
    const { page, per_page, search, category, brand, startDate, endDate, channel } = req.query;
    const result = await reportsService.getProductSalesReport({
      page: page ? Number(page) : 1,
      per_page: per_page ? Number(per_page) : 10,
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      brand: brand ? String(brand) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      channel: channel ? String(channel) : 'all',
    });

    sendResponse(res, {
      statusCode: HttpStatusCode.Ok,
      success: true,
      message: 'Product sales report retrieved successfully',
      data: result,
    });
  });

  getPurchaseReport = catchAsync(async (req: Request, res: Response) => {
    const { page, per_page, search, category, brand } = req.query;
    const result = await reportsService.getPurchaseReport({
      page: page ? Number(page) : 1,
      per_page: per_page ? Number(per_page) : 10,
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      brand: brand ? String(brand) : undefined,
    });

    sendResponse(res, {
      statusCode: HttpStatusCode.Ok,
      success: true,
      message: 'Purchase and inventory report retrieved successfully',
      data: result,
    });
  });
}


export const reportsController = new ReportsController();
