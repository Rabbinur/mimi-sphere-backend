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
    const result = await posService.createPosOrder(req.body, req.user);

    sendResponse(res, {
      statusCode: HttpStatusCode.CREATED,
      success: true,
      message: 'POS Order created successfully',
      data: result,
    });
  });

  getCashierShiftSummary = catchAsync(async (req: Request, res: Response) => {
    const cashierId = (req.query.cashier_id as string) || (req.user as any)?.id || (req.user as any)?._id;
    const result = await posService.getCashierShiftSummary(
      cashierId ? String(cashierId) : undefined,
      req.query.date as string | undefined,
    );

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'Cashier Shift summary fetched successfully',
      data: result,
    });
  });

  getCashierReports = catchAsync(async (req: Request, res: Response) => {
    const { cashier_id, period, start_date, end_date } = req.query;
    const result = await posService.getCashierReports({
      cashier_id: cashier_id ? String(cashier_id) : undefined,
      period: (period as 'daily' | 'weekly' | 'monthly') || 'daily',
      start_date: start_date ? String(start_date) : undefined,
      end_date: end_date ? String(end_date) : undefined,
    });

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'Cashier sales report fetched successfully',
      data: result,
    });
  });

  getPosShiftSummary = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.getPosShiftSummary(req.query.date as string | undefined);

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'POS Shift summary fetched successfully',
      data: result,
    });
  });

  getTodayProfit = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.getTodayProfit(req.query);

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: "Today's profit analytics fetched successfully",
      data: result,
    });
  });

  getLastReceipt = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.getLastReceipt();

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: result ? 'Last POS receipt retrieved successfully' : 'No previous POS receipt found',
      data: result,
    });
  });

  lookupCustomer = catchAsync(async (req: Request, res: Response) => {
    const { phone } = req.params;
    const result = await posService.lookupCustomer(String(phone || ''));

    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: result ? 'Customer found' : 'Customer not found',
      data: result,
    });
  });

  getMembersList = catchAsync(async (req: Request, res: Response) => {
    const { search, tier, page, per_page } = req.query;
    const result = await posService.getMembersList({
      search: search ? String(search) : undefined,
      tier: tier ? String(tier) : undefined,
      page: page ? Number(page) : undefined,
      per_page: per_page ? Number(per_page) : undefined,
    });
    sendResponse(res, { statusCode: HttpStatusCode.OK, success: true, message: 'Members fetched', data: result });
  });

  getCustomerHistory = catchAsync(async (req: Request, res: Response) => {
    const { phone } = req.params;
    const result = await posService.getCustomerHistory(String(phone));
    sendResponse(res, { statusCode: HttpStatusCode.OK, success: true, message: 'Customer history fetched', data: result });
  });

  getMembershipSettings = catchAsync(async (_req: Request, res: Response) => {
    const result = await posService.getMembershipSettings();
    sendResponse(res, { statusCode: HttpStatusCode.OK, success: true, message: 'Membership settings fetched', data: result });
  });

  updateMembershipSettings = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.updateMembershipSettings(req.body);
    sendResponse(res, { statusCode: HttpStatusCode.OK, success: true, message: 'Membership settings updated', data: result });
  });

  getPosOrdersList = catchAsync(async (req: Request, res: Response) => {
    const { status, search, page, per_page } = req.query;
    const result = await posService.getPosOrdersList({
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
      page: page ? Number(page) : undefined,
      per_page: per_page ? Number(per_page) : undefined,
    });
    sendResponse(res, { statusCode: HttpStatusCode.OK, success: true, message: 'POS orders retrieved successfully', data: result });
  });

  getPosTransactions = catchAsync(async (req: Request, res: Response) => {
    const { type, search, page, per_page } = req.query;
    const result = await posService.getPosTransactions({
      type: type ? String(type) : undefined,
      search: search ? String(search) : undefined,
      page: page ? Number(page) : undefined,
      per_page: per_page ? Number(per_page) : undefined,
    });
    sendResponse(res, { statusCode: HttpStatusCode.OK, success: true, message: 'POS transactions retrieved successfully', data: result });
  });

  updatePosTransaction = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await posService.updatePosTransaction(id, req.body);
    sendResponse(res, { statusCode: HttpStatusCode.OK, success: true, message: 'POS transaction updated successfully', data: result });
  });

  createPosExpense = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.createPosExpense(req.body);
    sendResponse(res, {
      statusCode: HttpStatusCode.CREATED,
      success: true,
      message: 'Expense added successfully',
      data: result,
    });
  });

  getPosExpenses = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.getPosExpenses(req.query);
    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'Expenses retrieved successfully',
      data: result,
    });
  });

  deletePosExpense = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await posService.deletePosExpense(id);
    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'Expense deleted successfully',
      data: result,
    });
  });

  syncOfflineOrders = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.syncOfflineOrders(req.body);
    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: `${result.synced_count} offline orders processed successfully`,
      data: result,
    });
  });

  syncOfflineExpenses = catchAsync(async (req: Request, res: Response) => {
    const result = await posService.syncOfflineExpenses(req.body);
    sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: `${result.synced_count} offline expenses processed successfully`,
      data: result,
    });
  });
}


export const posController = new PosController();

