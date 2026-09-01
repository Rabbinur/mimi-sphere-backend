import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { GoogleEventModel } from './google-analytics.model';
import { getGA4LiveReport } from '../../utils/googleAnalytics';

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const {
    startDate = '30daysAgo',
    endDate = 'today',
    page = 1,
    limit = 10,
  } = req.query;

  // 1. Fetch Live Data from Google GA4
  const liveGAData = await getGA4LiveReport(
    startDate as string,
    endDate as string,
  );

  // 2. Fetch Local Event Logs (Measurement Protocol history)
  const query: any = {};
  if (startDate && endDate && startDate !== '30daysAgo') {
    query.createdAt = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string),
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  // Aggregations for the local dashboard summary
  const eventCounts = await GoogleEventModel.aggregate([
    { $match: query },
    { $group: { _id: '$eventName', count: { $sum: 1 } } },
  ]);

  const dailyTrends = await GoogleEventModel.aggregate([
    { $match: query },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const statusCounts = await GoogleEventModel.aggregate([
    { $match: query },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const totalEvents = await GoogleEventModel.countDocuments(query);
  const recentEvents = await GoogleEventModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: {
      liveGAData, // New: Live data from Google
      eventCounts,
      dailyTrends,
      statusCounts,
      recentEvents,
      pagination: {
        total: totalEvents,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalEvents / Number(limit)),
      },
    },
  });
});

export const GoogleAnalyticsController = {
  getAnalytics,
};
