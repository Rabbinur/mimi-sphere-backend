/* eslint-disable @typescript-eslint/no-explicit-any */
import { bkashApi } from './bkash.utils';
import { TBkashCreatePaymentRequest } from './bkash.interface';

const createPayment = async (payload: TBkashCreatePaymentRequest) => {
  const { data } = await bkashApi.post('/create', payload);
  return data;
};

const executePayment = async (paymentID: string) => {
  const { data } = await bkashApi.post('/execute', { paymentID });
  return data;
};

const queryPayment = async (paymentID: string) => {
  const { data } = await bkashApi.post('/payment/status', { paymentID });
  return data;
};

export const BkashService = {
  createPayment,
  executePayment,
  queryPayment,
};
