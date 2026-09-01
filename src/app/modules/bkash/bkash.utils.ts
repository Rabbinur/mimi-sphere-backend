/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import { TBkashTokenResponse } from './bkash.interface';

// Create an isolated instance to avoid global interceptors or defaults
const bkashClient = axios.create();

import https from 'https';

export const getBkashHeaders = async () => {
  return new Promise<{ [key: string]: string }>((resolve, reject) => {
    const grantTokenUrl = new URL(`${config.bkash.base_url}tokenized/checkout/token/grant`);
    console.log('Hitting bKash Grant Token (https module):', grantTokenUrl.toString());

    const body = JSON.stringify({
      app_key: config.bkash.app_key,
      app_secret: config.bkash.app_secret,
    });

    const options = {
      hostname: grantTokenUrl.hostname,
      path: grantTokenUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': config.bkash.username || '',
        'password': config.bkash.password || '',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        let data: any;
        try {
          data = JSON.parse(responseBody);
        } catch (e) {
          return reject(new Error('bKash: Invalid JSON response from server'));
        }

        if (res.statusCode !== 200 || !data || !data.id_token) {
          console.error('bKash Grant Token Error response:', data);
          return reject(new Error(`bKash: ${data?.message || 'Invalid token response'}`));
        }

        resolve({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': data.id_token,
          'X-App-Key': config.bkash.app_key,
        });
      });
    });

    req.on('error', (error) => {
      console.error('bKash Grant Token Exception:', error.message);
      reject(error);
    });

    req.write(body);
    req.end();
  });
};


export const bkashApi = {
  post: async (endpoint: string, body: any) => {
    const headers = await getBkashHeaders();
    const url = `${config.bkash.base_url}tokenized/checkout${endpoint}`;
    return bkashClient.post(url, body, { headers });
  },
};
