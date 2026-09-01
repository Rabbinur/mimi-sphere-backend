import { Request, Response } from 'express';
import { CheckoutLeadServices } from './checkout-lead.services';

const upsertCheckoutLead = async (req: Request, res: Response) => {
  try {
    const lead = await CheckoutLeadServices.upsertCheckoutLead(req.body);
    res.status(200).json({
      success: true,
      message: 'Checkout lead upserted successfully',
      data: lead
    });
  } catch (error: any) {
    console.error('Error upserting checkout lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upsert checkout lead',
      error: error.message
    });
  }
};

const getCheckoutLeads = async (req: Request, res: Response) => {
  try {
    const result = await CheckoutLeadServices.getCheckoutLeads(req.query);
    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error: any) {
    console.error('Error fetching checkout leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checkout leads',
      error: error.message
    });
  }
};

const addFollowUpLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await CheckoutLeadServices.addFollowUpLog(id, req.body);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Checkout lead not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Follow-up log added successfully',
      data: lead
    });
  } catch (error: any) {
    console.error('Error adding follow-up log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add follow-up log',
      error: error.message
    });
  }
};

export const CheckoutLeadController = {
  upsertCheckoutLead,
  getCheckoutLeads,
  addFollowUpLog
};
