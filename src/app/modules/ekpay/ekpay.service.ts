// modules/ekpay/ekpay.service.ts
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';
import { EkPayInitiatePaymentRequest, EkPayInitiatePaymentResponse } from './ekpay.interface';

const baseURL = 'https://sandbox.ekpay.gov.bd/ekpaypg/v1/merchant-api';

export const initiatePayment = async (
    paymentData: EkPayInitiatePaymentRequest
): Promise<EkPayInitiatePaymentResponse> => {
    try {
        const response = await axios.post<EkPayInitiatePaymentResponse>(baseURL, paymentData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return response.data;
    } catch (error: any) {
        console.error('Error initiating payment:', error);
        throw error;
    }
};