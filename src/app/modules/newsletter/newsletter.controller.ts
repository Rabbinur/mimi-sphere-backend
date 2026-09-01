import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { NewsletterServices } from './newsletter.service';

const subscribe = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.subscribeNewsletter(req.body);
  res.status(201).json({
    success: true,
    message: 'Subscription successful',
    data: result,
  });
});

const getSubscribers = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.getAllSubscribers();
  res.status(200).json({
    success: true,
    message: 'Subscribers fetched successfully',
    data: result,
  });
});

export const NewsletterController = {
  subscribe,
  getSubscribers,
};
