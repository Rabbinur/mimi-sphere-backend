import axios from 'axios';
import crypto from 'crypto';
import config from '../config';
import { MetaEventModel } from '../modules/meta-events/meta-events.model';

const hashData = (data: string | undefined): string | null => {
  if (!data) return null;
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
};

export const sendFBEvent = async ({
  eventName,
  eventTime = Math.floor(Date.now() / 1000),
  eventId,
  userData,
  customData,
  eventSourceUrl,
  actionSource = 'website',
}: {
  eventName: string;
  eventTime?: number;
  eventId?: string;
  userData: {
    em?: string | string[];
    ph?: string | string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
    fn?: string | string[];
    ln?: string | string[];
    ct?: string | string[];
    st?: string | string[];
    zp?: string | string[];
    country?: string | string[];
    external_id?: string | string[];
  };
  customData?: any;
  eventSourceUrl?: string;
  actionSource?: string;
}) => {
  const { token, pixelId, apiVersion } = config.meta;

  if (!token || !pixelId || pixelId === 'YOUR_PIXEL_ID_HERE') {
    // console.warn('Meta Token or Pixel ID missing. Skipping FB event.');
    return;
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        action_source: actionSource,
        event_source_url: eventSourceUrl,
        user_data: {
          em: Array.isArray(userData.em)
            ? userData.em.map((e) => hashData(e)).filter(Boolean)
            : userData.em
              ? [hashData(userData.em)]
              : [],
          ph: Array.isArray(userData.ph)
            ? userData.ph.map((p) => hashData(p)).filter(Boolean)
            : userData.ph
              ? [hashData(userData.ph)]
              : [],
          client_ip_address: userData.client_ip_address,
          client_user_agent: userData.client_user_agent,
          fbc: userData.fbc,
          fbp: userData.fbp,
          fn: Array.isArray(userData.fn)
            ? userData.fn.map((f) => hashData(f)).filter(Boolean)
            : userData.fn
              ? [hashData(userData.fn)]
              : [],
          ln: Array.isArray(userData.ln)
            ? userData.ln.map((l) => hashData(l)).filter(Boolean)
            : userData.ln
              ? [hashData(userData.ln)]
              : [],
          ct: Array.isArray(userData.ct)
            ? userData.ct.map((c) => hashData(c)).filter(Boolean)
            : userData.ct
              ? [hashData(userData.ct)]
              : [],
          st: Array.isArray(userData.st)
            ? userData.st.map((s) => hashData(s)).filter(Boolean)
            : userData.st
              ? [hashData(userData.st)]
              : [],
          zp: Array.isArray(userData.zp)
            ? userData.zp.map((z) => hashData(z)).filter(Boolean)
            : userData.zp
              ? [hashData(userData.zp)]
              : [],
          country: Array.isArray(userData.country)
            ? userData.country.map((c) => hashData(c)).filter(Boolean)
            : userData.country
              ? [hashData(userData.country)]
              : [],
          external_id: Array.isArray(userData.external_id)
            ? userData.external_id.map((ex) => hashData(ex)).filter(Boolean)
            : userData.external_id
              ? [hashData(userData.external_id)]
              : [],
        },
        custom_data: customData,
      },
    ],
    test_event_code: config.meta.testEventCode || undefined,
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${token}`,
      payload,
    );

    // Save to Database
    await MetaEventModel.create({
      eventName,
      eventId,
      eventTime,
      userData: {
        em: Array.isArray(userData.em) ? userData.em : userData.em ? [userData.em] : [],
        ph: Array.isArray(userData.ph) ? userData.ph : userData.ph ? [userData.ph] : [],
        client_ip_address: userData.client_ip_address,
        client_user_agent: userData.client_user_agent,
        fbc: userData.fbc,
        fbp: userData.fbp,
        fn: Array.isArray(userData.fn) ? userData.fn : userData.fn ? [userData.fn] : [],
        ln: Array.isArray(userData.ln) ? userData.ln : userData.ln ? [userData.ln] : [],
        ct: Array.isArray(userData.ct) ? userData.ct : userData.ct ? [userData.ct] : [],
        st: Array.isArray(userData.st) ? userData.st : userData.st ? [userData.st] : [],
        zp: Array.isArray(userData.zp) ? userData.zp : userData.zp ? [userData.zp] : [],
        country: Array.isArray(userData.country) ? userData.country : userData.country ? [userData.country] : [],
        external_id: Array.isArray(userData.external_id) ? userData.external_id : userData.external_id ? [userData.external_id] : [],
      },
      customData,
      eventSourceUrl,
      actionSource,
      status: 'sent',
    });

    return response.data;
  } catch (error: any) {
    const errorMsg = error.response?.data || error.message;
    console.error('Error sending Facebook event:', errorMsg);

    // Save failed event to Database
    await MetaEventModel.create({
      eventName,
      eventId,
      eventTime,
      userData: {
        em: Array.isArray(userData.em) ? userData.em : userData.em ? [userData.em] : [],
        ph: Array.isArray(userData.ph) ? userData.ph : userData.ph ? [userData.ph] : [],
        client_ip_address: userData.client_ip_address,
        client_user_agent: userData.client_user_agent,
        fbc: userData.fbc,
        fbp: userData.fbp,
        fn: Array.isArray(userData.fn) ? userData.fn : userData.fn ? [userData.fn] : [],
        ln: Array.isArray(userData.ln) ? userData.ln : userData.ln ? [userData.ln] : [],
        ct: Array.isArray(userData.ct) ? userData.ct : userData.ct ? [userData.ct] : [],
        st: Array.isArray(userData.st) ? userData.st : userData.st ? [userData.st] : [],
        zp: Array.isArray(userData.zp) ? userData.zp : userData.zp ? [userData.zp] : [],
        country: Array.isArray(userData.country) ? userData.country : userData.country ? [userData.country] : [],
        external_id: Array.isArray(userData.external_id) ? userData.external_id : userData.external_id ? [userData.external_id] : [],
      },
      customData,
      eventSourceUrl,
      actionSource,
      status: 'failed',
      errorMessage: JSON.stringify(errorMsg),
    });
  }
};
