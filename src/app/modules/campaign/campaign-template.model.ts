import { Schema, model, Types } from 'mongoose';

export interface ICampaignTemplate {
  name: string;
  subject: string;
  content: string;
  createdBy: Types.ObjectId;
}

const campaignTemplateSchema = new Schema<ICampaignTemplate>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
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

export const CampaignTemplate = model<ICampaignTemplate>('CampaignTemplate', campaignTemplateSchema);
