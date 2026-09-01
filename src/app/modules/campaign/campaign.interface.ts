import { Types } from 'mongoose';

export type TCampaignStatus = 'draft' | 'sending' | 'sent' | 'failed';
export type TCampaignTarget = 'all_users' | 'newsletter_subscribers' | 'all';

export interface ICampaign {
  title: string;
  subject: string;
  content: string;
  target: TCampaignTarget[]; // Changed to Array
  status: TCampaignStatus;
  recipientsCount: number;
  manualEmails: string[];
  excludedEmails: string[]; // New field for deselected emails
  sentAt?: Date;
  sentTo?: {
    email: string;
    status: 'sent' | 'opened';
    openedAt?: Date;
  }[];
  createdBy: Types.ObjectId;
}
