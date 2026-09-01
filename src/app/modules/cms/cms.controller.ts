import { Request, Response } from 'express';
import CMSService from './cms.service';

class CMSController {
  /**
   * GET /api/cms
   */
  async get(req: Request, res: Response) {
    const data = await CMSService.getCMS();
    res.status(200).json({
      success: true,
      message: 'CMS settings fetched successfully',
      data,
    });
  }

  /**
   * PUT /api/cms
   */
  async update(req: Request, res: Response) {
    const updated = await CMSService.updateCMS(req.body);

    res.status(200).json({
      message: 'CMS settings updated successfully',
      data: updated,
    });
  }
}

export default new CMSController();
