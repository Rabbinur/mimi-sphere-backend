import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { CampaignServices } from './campaign.service';

const createCampaign = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await CampaignServices.createCampaign({
    ...req.body,
    createdBy: userId,
  });

  res.status(201).json({
    success: true,
    message: 'Campaign created successfully',
    data: result,
  });
});

const getAllCampaigns = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignServices.getAllCampaigns();

  res.status(200).json({
    success: true,
    message: 'Campaigns fetched successfully',
    data: result,
  });
});

const getSingleCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignServices.getSingleCampaign(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Campaign fetched successfully',
    data: result,
  });
});

const updateCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignServices.updateCampaign(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Campaign updated successfully',
    data: result,
  });
});

const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
  await CampaignServices.deleteCampaign(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Campaign deleted successfully',
    data: null,
  });
});

const sendCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignServices.sendCampaign(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Campaign sending initiated',
    data: result,
  });
});

const getRecipientPreview = catchAsync(async (req: Request, res: Response) => {
    const { target } = req.query;
    const result = await CampaignServices.getRecipientPreview(target as string);
    res.status(200).json({
        success: true,
        data: result,
    });
});

// --- Templates ---
const createTemplate = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await CampaignServices.createTemplate({
        ...req.body,
        createdBy: userId,
    });
    res.status(201).json({
        success: true,
        message: 'Template saved successfully',
        data: result,
    });
});

const getAllTemplates = catchAsync(async (req: Request, res: Response) => {
    const result = await CampaignServices.getAllTemplates();
    res.status(200).json({
        success: true,
        data: result,
    });
});

const updateTemplate = catchAsync(async (req: Request, res: Response) => {
    const result = await CampaignServices.updateTemplate(req.params.id, req.body);
    res.status(200).json({
        success: true,
        message: 'Template updated successfully',
        data: result,
    });
});

const deleteTemplate = catchAsync(async (req: Request, res: Response) => {
    await CampaignServices.deleteTemplate(req.params.id);
    res.status(200).json({
        success: true,
        message: 'Template deleted successfully',
    });
});

const trackEmailOpen = catchAsync(async (req: Request, res: Response) => {
    const { campaignId, email } = req.params;
    await CampaignServices.trackEmailOpen(campaignId, email);

    // Return a 1x1 transparent GIF
    const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': img.length,
    });
    res.end(img);
});

export const CampaignController = {
  createCampaign,
  getAllCampaigns,
  getSingleCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  getRecipientPreview,
  createTemplate,
  getAllTemplates,
  updateTemplate,
  deleteTemplate,
  trackEmailOpen,
};
