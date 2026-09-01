import { Types } from 'mongoose';
import { Campaign } from './campaign.model';
import { ICampaign } from './campaign.interface';
import { Newsletter } from '../newsletter/newsletter.model';
import User from '../users/user.model';
import { MailService } from '../../config/mailService';
import { CampaignTemplate, ICampaignTemplate } from './campaign-template.model';

const createCampaign = async (payload: ICampaign) => {
  const result = await Campaign.create(payload);
  return result;
};

const getAllCampaigns = async () => {
  const result = await Campaign.find().sort({ createdAt: -1 });
  return result;
};

const getSingleCampaign = async (id: string) => {
  const result = await Campaign.findById(id);
  return result;
};

const updateCampaign = async (id: string, payload: Partial<ICampaign>) => {
  const result = await Campaign.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteCampaign = async (id: string) => {
  const result = await Campaign.findByIdAndDelete(id);
  return result;
};

const getRecipientPreview = async (targets: string | string[]) => {
  let emails: string[] = [];
  const targetArray = Array.isArray(targets)
    ? targets
    : targets
      ? (targets as string).split(',')
      : [];

  if (
    targetArray.includes('newsletter_subscribers') ||
    targetArray.includes('all')
  ) {
    const subscribers = await Newsletter.find({ isActive: true }).select(
      'email',
    );
    emails = [...emails, ...subscribers.map((s) => s.email)];
  }

  if (targetArray.includes('all_users') || targetArray.includes('all')) {
    const users = await User.find({ role: 'USER' }).select('email');
    emails = [...emails, ...users.map((u) => u.email)];
  }

  return Array.from(new Set(emails));
};

const sendCampaign = async (id: string) => {
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'sending' || campaign.status === 'sent') {
    throw new Error('Campaign already sent or currently sending');
  }

  // Update campaign status to sending
  await Campaign.findByIdAndUpdate(id, { status: 'sending' });

  // Get actual recipients
  let emails: string[] = await getRecipientPreview(campaign.target);

  // Add manual emails
  if (campaign.manualEmails && campaign.manualEmails.length > 0) {
    emails = [...emails, ...campaign.manualEmails];
  }

  // Remove duplicates and invalid emails
  let finalEmails = Array.from(
    new Set(emails.filter((e) => e && e.includes('@'))),
  );

  // Filter out excluded emails
  if (campaign.excludedEmails && campaign.excludedEmails.length > 0) {
    const excludedSet = new Set(campaign.excludedEmails);
    finalEmails = finalEmails.filter((email) => !excludedSet.has(email));
  }

  // Update count and prepare for tracking
  const sentToData = finalEmails.map((email) => ({
    email,
    status: 'sent' as const,
  }));

  // Start sending in background
  const sendProcess = async () => {
    try {
      const batchSize = 10;
      for (let i = 0; i < finalEmails.length; i += batchSize) {
        const batch = finalEmails.slice(i, i + batchSize);

        await Promise.all(
          batch.map((email) => {
            const encodedEmail = Buffer.from(email).toString('base64');
            const trackingUrl = `https://server.shoppingcart.bd/api/v1/campaigns/track/${campaign._id}/${encodeURIComponent(encodedEmail)}`;
            const trackedContent = `${campaign.content}<img src="${trackingUrl}" width="1" height="1" style="display:none !important;" />`;

            return MailService.sendRaw({
              to: email,
              subject: campaign.subject,
              htmlContent: trackedContent,
            });
          }),
        );

        if (i + batchSize < finalEmails.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      await Campaign.findByIdAndUpdate(id, {
        status: 'sent',
        sentAt: new Date(),
        sentTo: sentToData,
      });
    } catch (error) {
      console.error('Email batch sending failed:', error);
      await Campaign.findByIdAndUpdate(id, { status: 'failed' });
    }
  };

  sendProcess();
  return campaign;
};

const trackEmailOpen = async (campaignId: string, encodedEmail: string) => {
  try {
    const email = Buffer.from(encodedEmail, 'base64').toString('ascii');

    // Update the specific recipient status in the array
    await Campaign.updateOne(
      { _id: campaignId, 'sentTo.email': email, 'sentTo.status': 'sent' },
      {
        $set: {
          'sentTo.$.status': 'opened',
          'sentTo.$.openedAt': new Date(),
        },
      },
    );
  } catch (error) {
    console.error('Tracking failed:', error);
  }
};

// --- Template Services ---
const createTemplate = async (payload: ICampaignTemplate) => {
  const result = await CampaignTemplate.create(payload);
  return result;
};

const getAllTemplates = async () => {
  return await CampaignTemplate.find().sort({ createdAt: -1 });
};

const getSingleTemplate = async (id: string) => {
  return await CampaignTemplate.findById(id);
};

const updateTemplate = async (
  id: string,
  payload: Partial<ICampaignTemplate>,
) => {
  return await CampaignTemplate.findByIdAndUpdate(id, payload, { new: true });
};

const deleteTemplate = async (id: string) => {
  return await CampaignTemplate.findByIdAndDelete(id);
};

export const CampaignServices = {
  createCampaign,
  getAllCampaigns,
  getSingleCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  getRecipientPreview,
  createTemplate,
  getAllTemplates,
  getSingleTemplate,
  updateTemplate,
  deleteTemplate,
  trackEmailOpen,
};
