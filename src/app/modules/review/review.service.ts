import mongoose from 'mongoose';
import { Product } from '../products/product.model';
import { TReview } from './review.interface';
import { Review } from './review.model';

const createReviewIntoDB = async (payload: TReview) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate Product and get Slug
    const product = await Product.findById(payload.product_id).session(session);
    if (!product) {
      throw new Error('Product not found');
    }

    // Set slug from product for consistency
    payload.product_slug = product.url_handle as string;

    // 2. Create the review
    const result = await Review.create([payload], { session });

    // 3. Update Product average_rating and total_reviews
    const reviews = await Review.find({
      product_id: payload.product_id,
      status: 'approved',
    }).session(session);

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    await Product.findByIdAndUpdate(
      payload.product_id,
      {
        average_rating: averageRating,
        total_reviews: totalReviews,
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return result[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getReviewsFromDB = async (query: Record<string, unknown>) => {
  const { searchTerm, status, ...filter } = query;

  const searchFilter: any = { ...filter };

  if (searchTerm) {
    searchFilter.$or = [
      { comment: { $regex: searchTerm, $options: 'i' } },
      { reviewer_name: { $regex: searchTerm, $options: 'i' } },
      { product_slug: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (status) {
    searchFilter.status = status;
  }

  const result = await Review.find(searchFilter)
    .populate('user_id', 'name email image')
    .sort('-createdAt');
  return result;
};

const getReviewsByProductFromDB = async (identifier: string) => {
  // Check if identifier is an ObjectId or Slug
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);

  const filter = isObjectId
    ? { product_id: identifier, status: 'approved' }
    : { product_slug: identifier, status: 'approved' };

  const result = await Review.find(filter)
    .populate('user_id', 'name email image')
    .sort('-createdAt');

  return result;
};

const deleteReviewFromDB = async (id: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const review = await Review.findById(id).session(session);
    if (!review) {
      throw new Error('Review not found');
    }

    const productId = review.product_id;
    await Review.findByIdAndDelete(id).session(session);

    // Recalculate Product average_rating and total_reviews
    const reviews = await Review.find({
      product_id: productId,
      status: 'approved',
    }).session(session);

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    await Product.findByIdAndUpdate(
      productId,
      {
        average_rating: averageRating,
        total_reviews: totalReviews,
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return null;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const updateReviewStatusInDB = async (id: string, status: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const review = await Review.findByIdAndUpdate(
      id,
      { status },
      { new: true, session },
    );

    if (!review) {
      throw new Error('Review not found');
    }

    // Recalculate ratings because status changed (might affect 'approved' count)
    const reviews = await Review.find({
      product_id: review.product_id,
      status: 'approved',
    }).session(session);

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    await Product.findByIdAndUpdate(
      review.product_id,
      {
        average_rating: averageRating,
        total_reviews: totalReviews,
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return review;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const ReviewServices = {
  createReviewIntoDB,
  getReviewsFromDB,
  getReviewsByProductFromDB,
  deleteReviewFromDB,
  updateReviewStatusInDB,
};
