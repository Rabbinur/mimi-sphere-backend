export type TBkashTokenResponse = {
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

export type TBkashCreatePaymentRequest = {
  mode: string;
  payerReference: string;
  callbackURL: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
};

export type TBkashCreatePaymentResponse = {
  paymentID: string;
  bkashURL: string;
  callbackURL: string;
  success: boolean;
  message?: string;
};

export type TBkashExecutePaymentResponse = {
  paymentID: string;
  trxID: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  customerMsisdn: string;
  paymentExecuteTime: string;
  statusCode: string;
  statusMessage: string;
};
