import { Newsletter } from './newsletter.model';
import { TNewsletter } from './newsletter.interface';

const subscribeNewsletter = async (payload: TNewsletter) => {
  // Check if email already exists
  const existing = await Newsletter.findOne({ email: payload.email });

  if (existing) {
    if (!existing.isActive) {
      // Reactivate if it was inactive
      existing.isActive = true;
      await existing.save();
      return existing;
    }
    throw new Error('Email is already subscribed');
  }

  const result = await Newsletter.create(payload);
  return result;
};

const getAllSubscribers = async () => {
  const result = await Newsletter.find();
  return result;
};

export const NewsletterServices = {
  subscribeNewsletter,
  getAllSubscribers,
};
