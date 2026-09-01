import { z } from 'zod';

const createCampaignValidationSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: 'Title is required',
    }),
    subject: z.string({
      required_error: 'Subject is required',
    }),
    content: z.string({
      required_error: 'Content is required',
    }),
    target: z.array(z.enum(['all_users', 'newsletter_subscribers', 'all'])).optional(),
    manualEmails: z.array(z.string().email()).optional(),
    excludedEmails: z.array(z.string()).optional(),
  }),
});

const updateCampaignValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    subject: z.string().optional(),
    content: z.string().optional(),
    target: z.array(z.enum(['all_users', 'newsletter_subscribers', 'all'])).optional(),
    status: z.enum(['draft', 'sending', 'sent', 'failed']).optional(),
    manualEmails: z.array(z.string().email()).optional(),
    excludedEmails: z.array(z.string()).optional(),
  }),
});

export const CampaignValidation = {
  createCampaignValidationSchema,
  updateCampaignValidationSchema,
};
