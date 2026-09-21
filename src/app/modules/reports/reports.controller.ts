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
}

export const reportsController = new ReportsController();
