import axios from 'axios';
import { google } from 'googleapis';
import path from 'path';
import { GoogleEventModel } from '../modules/google-analytics/google-analytics.model';

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-SF4PDJQH1J';
const GA_API_SECRET = process.env.GA_API_SECRET || 'FuWRJx2nQ4iBqvr_18b4Mw';
const KEY_FILE_PATH = path.join(process.cwd(), 'google-analytics-key.json');
const PROPERTY_ID = process.env.GA_PROPERTY_ID || '535016961';


// --- Function to Send Events (Measurement Protocol) ---
export const sendGAEvent = async ({
  eventName,
  clientId,
  params = {},
}: {
  eventName: string;
  clientId: string;
  params?: any;
}) => {
  if (!GA_MEASUREMENT_ID || !GA_API_SECRET) {
    return;
  }

  const payload = {
    client_id: clientId,
    events: [
      {
        name: eventName,
        params: params,
      },
    ],
  };

  try {
    await axios.post(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
      payload,
    );

    // Save to Local DB for Admin Analytics
    await GoogleEventModel.create({
      eventName,
      clientId,
      params,
      status: 'sent',
    });
  } catch (error: any) {
    const errorMsg = error.response?.data || error.message;
    console.error('Error sending Google Analytics event:', errorMsg);

    // Save failed event
    await GoogleEventModel.create({
      eventName,
      clientId,
      params,
      status: 'failed',
      errorMessage: JSON.stringify(errorMsg),
    });
  }
};

// --- Function to Fetch Live Reports (Data API) ---
export const getGA4LiveReport = async (
  startDate = '30daysAgo',
  endDate = 'today',
) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_FILE_PATH,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const analyticsdata = google.analyticsdata({
      version: 'v1beta',
      auth: (await auth.getClient()) as any,
    });

    const response = await analyticsdata.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'eventName' },
          { name: 'country' },
          { name: 'date' },
          { name: 'pagePath' },
          { name: 'sessionSource' },
          { name: 'deviceCategory' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'eventCount' },
          { name: 'sessions' },
        ],
      },
    });


    return response.data;
  } catch (error: any) {
    console.error('GA4 Data API Error:', error.message);
    return null;
  }
};
