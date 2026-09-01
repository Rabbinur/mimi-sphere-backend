import { Request, Response } from 'express';
import BaseController from '../../shared/baseController';
import { ReviewServices } from './review.service';

class Controller extends BaseController {
  createReview = this.catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewServices.createReviewIntoDB(req.body);
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Review created successfully',
      data: result,
    });
  });

  getReviews = this.catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewServices.getReviewsFromDB(req.query);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Reviews retrieved successfully',
      data: result,
    });
  });

  getReviewsByProduct = this.catchAsync(async (req: Request, res: Response) => {
    const { identifier } = req.params;
    const result = await ReviewServices.getReviewsByProductFromDB(identifier);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product reviews retrieved successfully',
      data: result,
    });
  });

  deleteReview = this.catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ReviewServices.deleteReviewFromDB(id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Review deleted successfully',
      data: null,
    });
  });

  updateReviewStatus = this.catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await ReviewServices.updateReviewStatusInDB(id, status);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Review status updated successfully',
      data: result,
    });
  });
}

export const ReviewControllers = new Controller();
