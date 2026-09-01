/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
// modules/ekpay/ekpay.controller.ts
import { Request, Response } from 'express';
import { initiatePayment } from './ekpay.service';
import { EkPayInitiatePaymentRequest } from './ekpay.interface';
import config from '../../config';
import moment from 'moment-timezone';

export const initiatePaymentHandler = async (req: Request, res: Response) => {
    try {
        const paymentData: EkPayInitiatePaymentRequest = req.body;

        const payload = {
            mer_info: {
                mer_reg_id: config.merRegId,
                mer_pas_key: config.merPasKey
            },
            req_timestamp: moment().tz('Asia/Dhaka').format('YYYY-MM-DD HH:mm:ss') + ' GMT+6',
            ...paymentData
        };

        const ekpayResponse = await initiatePayment(payload);

        if (ekpayResponse && ekpayResponse.secure_token) {
            const redirectURL = `https://sandbox.ekpay.gov.bd/ekpaypg/v1?sToken=${ekpayResponse.secure_token}&trnsID=${paymentData.trns_info.trnx_id}`;
            res.json({ redirectURL });
        } else {
            // Handle the error
            console.error('eKPay Error:', ekpayResponse);
            res.status(500).json({ error: 'Payment initiation failed', ekpayResponse });
        }
    } catch (error: any) {
        console.error('Controller Error:', error);
        res.status(500).json({ error: 'Payment initiation failed', message: error.message });
    }
};
