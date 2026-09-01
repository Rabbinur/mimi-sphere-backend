export type IOrderPlacement = {
  customer_name: string;
  customer_email: string;
  product_name: string;
  order_id: number | string;
  order_track_url: string;
  order_date: string;
  total_amount: string;
};

export type IDigitalProductOrder = {
  name: string;
  price: number;
  file_links: string[];
};

export type MailPayload = {
  subject: string;
  from?: string;
  to: string | string[];
  htmlContent: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
};

