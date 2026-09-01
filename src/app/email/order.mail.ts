import config from '../config';

import { MailService } from '../config/mailService';
import { IOrderPlacement } from './mail.interface';

class Service {
  private formatOrderDate(isoDate: string) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(isoDate));
  }

  async orderPlace(payload: IOrderPlacement) {
    const {
      order_id,
      order_track_url,
      product_name,
      customer_email,
      customer_name,
      order_date,
      total_amount,
    } = payload;

    const content = `
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; padding: 20px;">
        <tr>
            <td style="text-align: center;">
                <h2 style="color: #333;">Thank you for your order, ${customer_name}!</h2>
                <p style="color: #666;">We’ve received your order and it’s being processed.</p>
            </td>
        </tr>
        <tr>
            <td>
                <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Order Summary</h3>
                <table width="100%" cellpadding="5" cellspacing="0" style="color: #333;">
                    <tr>
                        <td><strong>Order ID:</strong></td>
                        <td>${order_id}</td>
                    </tr>
                    <tr>
                        <td><strong>Product:</strong></td>
                        <td>${product_name}</td>
                    </tr>
                    <tr>
                        <td><strong>Order Date:</strong></td>
                        <td>${this.formatOrderDate(order_date)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Amount:</strong></td>
                        <td>${total_amount}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="text-align: center; padding: 20px 0;">
                <a href="${order_track_url}" style="background-color: #4CAF50; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Track Your Order</a>
            </td>
        </tr>
         
    </table>
    `;

    const title = '🛒 Your order has been placed';

    await MailService.send(title, {
      htmlContent: content,
      subject: title,
      to: customer_email,
      cc: [config.smtp.user],
    });
  }

  async orderConfirmation(payload: IOrderPlacement) {
    const {
      order_id,
      order_track_url,
      product_name,
      customer_email,
      customer_name,
      order_date,
      total_amount,
    } = payload;

    const content = `
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #fff; border-radius: 6px; padding: 20px; box-shadow: 0 0 8px rgba(0,0,0,0.05);">
    <tr>
      <td style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        <h2 style="color: #333; margin: 0;">Order Confirmation</h2>
        <p style="color: #666; font-size: 14px; margin: 5px 0 0;">Hello ${customer_name},</p>
        <p style="color: #666; font-size: 14px; margin: 5px 0;">We are pleased to confirm your recent order.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 15px 0;">
        <h3 style="color: #4CAF50; margin-bottom: 10px;">Order Details</h3>
        <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px; color: #333;">
          <tr>
            <td style="width: 40%;"><strong>Order ID:</strong></td>
            <td>${order_id}</td>
          </tr>
          <tr>
            <td><strong>Product Name:</strong></td>
            <td>${product_name}</td>
          </tr>
          <tr>
            <td><strong>Order Date:</strong></td>
            <td>${this.formatOrderDate(order_date)}</td>
          </tr>
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td>${total_amount}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="text-align: center; padding: 20px 0;">
        <a href="${order_track_url}" style="background-color: #4CAF50; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px;">
          View / Track Your Order
        </a>
      </td>
    </tr>
  </table>
    `;

    const title = '✅ Your Order Has Been Confirmed';

    await MailService.send(title, {
      htmlContent: content,
      subject: title,
      to: customer_email,
      cc: [config.smtp.user],
    });
  }

  async orderInTransit(payload: IOrderPlacement) {
    const {
      order_id,
      order_track_url,
      product_name,
      customer_email,
      customer_name,
      order_date,
      total_amount,
    } = payload;

    const content = `
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #fff; border-radius: 6px; padding: 20px; box-shadow: 0 0 8px rgba(0,0,0,0.05);">
        <tr>
          <td style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <h2 style="color: #333; margin: 0;">📦 Your Order is On the Way!</h2>
            <p style="color: #666; font-size: 14px; margin: 5px 0 0;">Hi ${customer_name},</p>
            <p style="color: #666; font-size: 14px; margin: 5px 0;">Good news! Your order has been shipped and is now in transit.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 0;">
            <h3 style="color: #4CAF50; margin-bottom: 10px;">Shipping Details</h3>
            <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px; color: #333;">
              <tr>
                <td style="width: 40%;"><strong>Order ID:</strong></td>
                <td>${order_id}</td>
              </tr>
              <tr>
                <td><strong>Product Name:</strong></td>
                <td>${product_name}</td>
              </tr>
              <tr>
                <td><strong>Order Date:</strong></td>
                <td>${this.formatOrderDate(order_date)}</td>
              </tr>
              <tr>
                <td><strong>Total Amount:</strong></td>
                <td>${total_amount}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; padding: 20px 0;">
            <a href="${order_track_url}" style="background-color: #2196F3; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px;">
              Track Your Shipment
            </a>
          </td>
        </tr>
      </table>
    
    `;

    const title = '📦 Your Order is On the Way!';

    await MailService.send(title, {
      htmlContent: content,
      subject: title,
      to: customer_email,
      cc: [config.smtp.user],
    });
  }

  async orderDelivered(payload: IOrderPlacement) {
    const {
      order_id,
      order_track_url,
      product_name,
      customer_email,
      customer_name,
      order_date,
      total_amount,
    } = payload;

    const content = `
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #fff; border-radius: 6px; padding: 20px; box-shadow: 0 0 8px rgba(0,0,0,0.05);">
    <tr>
      <td style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        <h2 style="color: #333; margin: 0;">✅ Your Order Has Been Delivered!</h2>
        <p style="color: #666; font-size: 14px; margin: 5px 0 0;">Hi ${customer_name},</p>
        <p style="color: #666; font-size: 14px; margin: 5px 0;">We’re happy to let you know that your order has been successfully delivered. We hope you enjoy your purchase!</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 15px 0;">
        <h3 style="color: #4CAF50; margin-bottom: 10px;">Order Details</h3>
        <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px; color: #333;">
          <tr>
            <td style="width: 40%;"><strong>Order ID:</strong></td>
            <td>${order_id}</td>
          </tr>
          <tr>
            <td><strong>Product Name:</strong></td>
            <td>${product_name}</td>
          </tr>
          <tr>
            <td><strong>Order Date:</strong></td>
            <td>${this.formatOrderDate(order_date)}</td>
          </tr>
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td>${total_amount}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="text-align: center; padding: 20px 0;">
        <a href="${order_track_url}" style="background-color: #4CAF50; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px;">
          View Order Details
        </a>
      </td>
    </tr>
  </table>
      `;
    const title = '✅ Your Order Has Been Delivered!';

    await MailService.send(title, {
      htmlContent: content,
      subject: title,
      to: customer_email,
      cc: [config.smtp.user],
    });
  }

  async orderCancelled(payload: IOrderPlacement) {
    const {
      order_id,
      order_track_url,
      product_name,
      customer_email,
      customer_name,
      order_date,
      total_amount,
    } = payload;

    const content = `
  <table align="center" width="100%" style="max-width: 600px; background: #fff; border-radius: 6px; padding: 20px; box-shadow: 0 0 8px rgba(0,0,0,0.05);">
    <tr><td style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px;">
      <h2 style="color: #e53935; margin: 0;">❗ Your Order Has Been Cancelled</h2>
      <p style="color: #666; font-size: 14px; margin: 5px 0 0;">Hi ${customer_name},</p>
      <p style="color: #666; font-size: 14px; margin: 5px 0;">
        This is to confirm that your order has been successfully cancelled as per your request.<br/>
        If you have any questions or wish to place a new order, feel free to reach out to us.
      </p>
    </td></tr>
    <tr><td style="padding: 15px 0;">
      <h3 style="color: #e53935; margin-bottom: 10px;">Order Summary</h3>
      <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px; color: #333;">
        <tr><td style="width: 40%;"><strong>Order ID:</strong></td><td>${order_id}</td></tr>
        <tr><td><strong>Product Name:</strong></td><td>${product_name}</td></tr>
        <tr><td><strong>Order Date:</strong></td><td>${this.formatOrderDate(
          order_date,
        )}</td></tr>
        <tr><td><strong>Total Amount:</strong></td><td>${total_amount}</td></tr>
      </table>
    </td></tr>
    <tr><td style="text-align: center; padding: 20px 0;">
      <a href="${order_track_url}" style="background: #e53935; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 4px;">View Order Details</a>
    </td></tr>
  </table>
    `;

    const title = '❗ Your Order Has Been Cancelled';
    await MailService.send(title, {
      htmlContent: content,
      subject: title,
      to: customer_email,
      cc: [config.smtp.user],
    });
  }
}

export const OrderMailService = new Service();
