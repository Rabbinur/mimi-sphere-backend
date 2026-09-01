import { Schema, model } from 'mongoose';
import { TCheckoutLead } from './checkout-lead.interface';

const cartItemSnapshotSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sku: { type: String, default: "" },
  image: { type: String, default: "" },
  slug: { type: String, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  quantity: { type: Number, required: true },
  variant: { type: Schema.Types.Mixed, default: null },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
}, { _id: false });

const followUpLogSchema = new Schema({
  agentId: { type: Schema.Types.ObjectId, ref: 'User' },
  agentName: { type: String, required: true },
  action: { type: String, enum: ['call', 'whatsapp', 'sms', 'email'], required: true },
  remarks: { type: String, default: "" },
  contactedAt: { type: Date, default: Date.now }
}, { _id: false });

const checkoutLeadSchema = new Schema<TCheckoutLead>({
  checkoutSessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  customerName: { type: String, default: "" },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  district: { type: String, default: "" },
  upazila: { type: String, default: "" },
  villageOrArea: { type: String, default: "" },
  cartItems: [cartItemSnapshotSchema],
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ['draft', 'pending', 'converted', 'abandoned', 'expired'],
    default: 'draft',
    index: true
  },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  leadScore: { type: Number, default: 0 },
  followUpHistory: [followUpLogSchema],
  utmSource: { type: String, default: "" },
  utmMedium: { type: String, default: "" },
  utmCampaign: { type: String, default: "" },
  fbclid: { type: String, default: "" },
  gclid: { type: String, default: "" },
  referer: { type: String, default: "" },
  device: { type: String, default: "" },
  browser: { type: String, default: "" },
  ipAddress: { type: String, default: "" },
  country: { type: String, default: "" },
  city: { type: String, default: "" },
  lastActivityAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, default: null, index: true }
}, { timestamps: true });

// Indexing phone and email for lookups
checkoutLeadSchema.index({ phone: 1 });
checkoutLeadSchema.index({ email: 1 });

// TTL index to automatically delete documents at the time specified by expiresAt.
// If expiresAt is unset, missing, or null, MongoDB will ignore it (i.e. no deletion).
checkoutLeadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CheckoutLeadModel = model<TCheckoutLead>('CheckoutLead', checkoutLeadSchema);

export default CheckoutLeadModel;
