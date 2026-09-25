// modules/ekpay/ekpay.service.ts
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';
import { EkPayInitiatePaymentRequest, EkPayInitiatePaymentResponse } from './ekpay.interface';
import { createCircuitBreaker } from '../../utils/circuitBreaker';

const baseURL = 'https://sandbox.ekpay.gov.bd/ekpaypg/v1/merchant-api';

const rawInitiatePayment = async (
  paymentData: EkPayInitiatePaymentRequest,
): Promise<EkPayInitiatePaymentResponse> => {
  const response = await axios.post<EkPayInitiatePaymentResponse>(baseURL, paymentData, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
  return response.data;
};

export const ekpayCircuitBreaker = createCircuitBreaker(
  rawInitiatePayment,
  'EkPay Payment Gateway',
  {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  },
);

ekpayCircuitBreaker.fallback((_paymentData: any, error?: Error) => {
  return {
    isCircuitBreakerFallback: true,
    status: 'CIRCUIT_OPEN',
    message:
      'EkPay payment gateway is temporarily unavailable. Please try Cash on Delivery (COD) or bKash.',
    error: error?.message || 'EkPay Gateway Timeout',
  } as any;
});

export const initiatePayment = async (
  paymentData: EkPayInitiatePaymentRequest,
): Promise<EkPayInitiatePaymentResponse> => {
  return await ekpayCircuitBreaker.fire(paymentData);
};