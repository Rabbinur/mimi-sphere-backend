/* eslint-disable @typescript-eslint/no-explicit-any */
import { bkashApi } from './bkash.utils';
import { TBkashCreatePaymentRequest } from './bkash.interface';
import { createCircuitBreaker } from '../../utils/circuitBreaker';

// Raw action implementations
const rawCreatePayment = async (payload: TBkashCreatePaymentRequest) => {
  const { data } = await bkashApi.post('/create', payload);
  return data;
};

const rawExecutePayment = async (paymentID: string) => {
  const { data } = await bkashApi.post('/execute', { paymentID });
  return data;
};

const rawQueryPayment = async (paymentID: string) => {
  const { data } = await bkashApi.post('/payment/status', { paymentID });
  return data;
};

// Protected with Circuit Breaker
export const bkashCreatePaymentBreaker = createCircuitBreaker(
  rawCreatePayment,
  'bKash Payment Gateway (Create)',
  {
    timeout: 10000, // 10 seconds max
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30s cooldown before testing HALF-OPEN
  },
);

bkashCreatePaymentBreaker.fallback((_payload: any, error?: Error) => {
  return {
    isCircuitBreakerFallback: true,
    statusCode: 'CIRCUIT_OPEN',
    statusMessage:
      'bKash payment gateway is temporarily unavailable. Please try Cash on Delivery (COD) or Card.',
    errorMessage: error?.message || 'bKash Gateway Timeout',
  };
});

export const bkashExecutePaymentBreaker = createCircuitBreaker(
  rawExecutePayment,
  'bKash Payment Gateway (Execute)',
  {
    timeout: 12000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  },
);

const createPayment = async (payload: TBkashCreatePaymentRequest) => {
  return await bkashCreatePaymentBreaker.fire(payload);
};

const executePayment = async (paymentID: string) => {
  return await bkashExecutePaymentBreaker.fire(paymentID);
};

const queryPayment = async (paymentID: string) => {
  return await rawQueryPayment(paymentID);
};

export const BkashService = {
  createPayment,
  executePayment,
  queryPayment,
};
