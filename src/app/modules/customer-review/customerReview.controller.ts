import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CustomerReviewServices } from './customerReview.service';

const createCustomerReview = catchAsync(async (req, res) => {
  const result = await CustomerReviewServices.createCustomerReviewIntoDB(
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Customer review created successfully',
    data: result,
  });
});

const getAllCustomerReviews = catchAsync(async (req, res) => {
  const result = await CustomerReviewServices.getAllCustomerReviewsFromDB(
    req.query
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer reviews retrieved successfully',
    data: result,
  });
});

const getSingleCustomerReview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await CustomerReviewServices.getSingleCustomerReviewFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer review retrieved successfully',
    data: result,
  });
});

const updateCustomerReview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await CustomerReviewServices.updateCustomerReviewInDB(
    id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer review updated successfully',
    data: result,
  });
});

const deleteCustomerReview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await CustomerReviewServices.deleteCustomerReviewFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer review deleted successfully',
    data: result,
  });
});

export const CustomerReviewControllers = {
  createCustomerReview,
  getAllCustomerReviews,
  getSingleCustomerReview,
  updateCustomerReview,
  deleteCustomerReview,
};
