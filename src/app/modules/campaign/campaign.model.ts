import { Schema, model } from 'mongoose';
import { ICampaign } from './campaign.interface';

const campaignSchema = new Schema<ICampaign>(
  {
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    target: {
      type: [String],
      enum: ['all_users', 'newsletter_subscribers', 'all'],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent', 'failed'],
      default: 'draft',
    },
    recipientsCount: {
      type: Number,
      default: 0,
    },
    manualEmails: {
      type: [String],
      default: [],
    },
    excludedEmails: {
      type: [String],
      default: [],
    },
    sentTo: [{
      email: { type: String, required: true },
      status: { type: String, enum: ['sent', 'opened'], default: 'sent' },
      openedAt: { type: Date }
    }],
    sentAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Campaign = model<ICampaign>('Campaign', campaignSchema);
