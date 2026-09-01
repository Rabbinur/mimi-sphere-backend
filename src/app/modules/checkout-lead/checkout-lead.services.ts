import { Types } from 'mongoose';
import { TCheckoutLead, TFollowUpLog } from './checkout-lead.interface';
import CheckoutLeadModel from './checkout-lead.model';

const upsertCheckoutLead = async (payload: Partial<TCheckoutLead>) => {
  const { 
    checkoutSessionId, 
    phone, 
    email, 
    customerName,
    cartItems,
    totalPrice,
    status,
    ...rest 
  } = payload;

  let existingLead = null;

  // 1. Primary Lookup: Checkout Session ID
  if (checkoutSessionId) {
    existingLead = await CheckoutLeadModel.findOne({ checkoutSessionId });
  }

  // 2. Secondary Lookup: Phone (must be non-converted and updated within the last 48 hours)
  if (!existingLead && phone) {
    const timeWindowLimit = new Date();
    timeWindowLimit.setHours(timeWindowLimit.getHours() - 48);

    existingLead = await CheckoutLeadModel.findOne({
      phone,
      status: { $ne: 'converted' },
      lastActivityAt: { $gte: timeWindowLimit }
    });
  }

  // 3. Tertiary Lookup: Email (must be non-converted)
  if (!existingLead && email) {
    existingLead = await CheckoutLeadModel.findOne({
      email,
      status: { $ne: 'converted' }
    });
  }

  // 4. Calculate Lead Score (0 - 100)
  let score = 0;
  if (customerName) score += 20;
  if (phone) score += 40;
  if (rest.district) score += 10;
  if (rest.upazila) score += 10;
  if (totalPrice && totalPrice > 5000) score += 20;
  else if (totalPrice && totalPrice > 0) score += 10;

  // 5. Expiration Handling (No expiry / TTL for converted status, 45 days for draft/pending)
  const isConverted = status === 'converted' || (existingLead && existingLead.status === 'converted');
  let expiresAt: Date | null = null;
  if (!isConverted) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 45); // 45 days TTL
  }

  // Determine current status: upgrade draft to pending if phone is provided
  const currentStatus = isConverted 
    ? 'converted' 
    : (phone ? 'pending' : 'draft');

  const leadData: Partial<TCheckoutLead> = {
    customerName,
    phone,
    email,
    cartItems,
    totalPrice,
    leadScore: score,
    status: currentStatus,
    lastActivityAt: new Date(),
    expiresAt,
    ...rest
  };

  if (existingLead) {
    const result = await CheckoutLeadModel.findByIdAndUpdate(
      existingLead._id,
      { $set: leadData },
      { new: true }
    );
    return result;
  } else {
    const result = await CheckoutLeadModel.create({
      checkoutSessionId: checkoutSessionId || `crs_${Math.random().toString(36).substring(2, 15)}`,
      ...leadData
    });
    return result;
  }
};

const getCheckoutLeads = async (filters: any) => {
  const { status, source, startDate, endDate, limit = 50, page = 1 } = filters;
  const query: any = {};

  if (status) {
    query.status = status;
  }
  if (source) {
    query.utmSource = new RegExp(source, 'i');
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const data = await CheckoutLeadModel.find(query)
    .sort({ lastActivityAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('userId', 'name email phone');

  const total = await CheckoutLeadModel.countDocuments(query);

  return {
    data,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit)
    }
  };
};

const addFollowUpLog = async (leadId: string, log: TFollowUpLog) => {
  const result = await CheckoutLeadModel.findByIdAndUpdate(
    leadId,
    { 
      $push: { followUpHistory: log },
      $set: { lastActivityAt: new Date() }
    },
    { new: true }
  );
  return result;
};

const convertLead = async (checkoutSessionId: string | undefined, phone: string, orderId: any) => {
  let lead = null;
  if (checkoutSessionId) {
    lead = await CheckoutLeadModel.findOne({ checkoutSessionId });
  }

  if (!lead && phone) {
    const timeWindowLimit = new Date();
    timeWindowLimit.setHours(timeWindowLimit.getHours() - 48);

    lead = await CheckoutLeadModel.findOne({
      phone,
      status: { $ne: 'converted' },
      lastActivityAt: { $gte: timeWindowLimit }
    });
  }

  if (lead) {
    const result = await CheckoutLeadModel.findByIdAndUpdate(
      lead._id,
      {
        $set: {
          status: 'converted',
          orderId: orderId,
        },
        $unset: { expiresAt: "" }
      },
      { new: true }
    );
    return result;
  }
  return null;
};

export const CheckoutLeadServices = {
  upsertCheckoutLead,
  getCheckoutLeads,
  addFollowUpLog,
  convertLead
};
