import { Request, Response } from 'express';
import { BkashService } from './bkash.service';
import { OrderModel, SuccessOrderModel } from '../orders/order.model';
import { OrderServices } from '../orders/order.services';
import config from '../../config';
import { sendFBEvent } from '../../utils/facebookConversions';
import { sendGAEvent } from '../../utils/googleAnalytics';
import { Product } from '../products/product.model';

export const createBkashPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, amount } = req.body;
    
    // Find order to verify
    let order = await OrderModel.findOne({ order_id: orderId });
    if (!order) {
      order = await SuccessOrderModel.findOne({ order_id: orderId });
    }
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const payload = {
      mode: '0011', // immediate orange
      payerReference: order.phone,
      callbackURL: `${req.protocol}://${req.get('host')}/api/v1/bkash/callback`,
      amount: amount.toString(),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: `${orderId}_${Date.now()}`,
    };

    const response = await BkashService.createPayment(payload);

    if (response && response.bkashURL) {
      res.status(200).json({ bkashURL: response.bkashURL });
    } else {
      res.status(400).json({ message: 'Failed to create bkash payment', response });
    }
  } catch (error: any) {
    console.error('bKash Create Payment Error:', error);
    res.status(500).json({ message: 'bKash integration error', error: error.message });
  }
};

export const bkashCallback = async (req: Request, res: Response) => {
  const { paymentID, status } = req.query;

  if (status === 'success') {
    try {
      const response = await BkashService.executePayment(paymentID as string);
      
      if (response && (response.statusCode === '0000' || response.transactionStatus === 'Completed')) {
        // Update Order
        const merchantInvoiceNumber = response.merchantInvoiceNumber;
        const orderId = merchantInvoiceNumber.split('_')[0];
        let order = await OrderModel.findOneAndUpdate(
          { order_id: orderId },
          { 
            payment_status: 'paid',
            'online_payment_details.trx_id': response.trxID,
            'online_payment_details.provider': 'bkash'
          },
          { new: true }
        );

        if (!order) {
          order = await SuccessOrderModel.findOneAndUpdate(
            { order_id: orderId },
            { 
              payment_status: 'paid',
              'online_payment_details.trx_id': response.trxID,
              'online_payment_details.provider': 'bkash'
            },
            { new: true }
          );
        }

        if (order) {
          // Resolve product SKUs from DB
          const productIds = order.products.map((p: any) => p.product_id);
          const productsFromDb = await Product.find({ _id: { $in: productIds } }).lean();
          const skuMap = new Map(productsFromDb.map((p: any) => [String(p._id), p.sku]));

          const contentIds = order.products.map((p: any) => {
            const sku = skuMap.get(String(p.product_id));
            return sku || String(p.product_id);
          });

          const contents = order.products.map((p: any) => {
            const sku = skuMap.get(String(p.product_id));
            return {
              id: sku || String(p.product_id),
              quantity: p.quantity,
              item_price: p.price,
            };
          });

          // Parse customer name into fn and ln
          const nameParts = (order.customer_name || '').trim().split(/\s+/);
          const fn = nameParts[0] || '';
          const ln = nameParts.slice(1).join(' ') || '';

          // Send Google Analytics purchase Event
          sendGAEvent({
            eventName: 'purchase',
            clientId: req.cookies?.['_ga'] || 'anonymous',
            params: {
              transaction_id: orderId,
              value: order.total_price,
              currency: 'BDT',
              items: order.products.map((p: any) => ({
                item_id: p.product_id,
                item_name: p.title,
                price: p.price,
                quantity: p.quantity,
              })),
            },
          });

          // Send Order Confirmation Email
          await OrderServices.sendOrderConfirmationEmail(order);
        }

        return res.redirect(`${config.frontend_url}/payment/success?orderId=${orderId}`);
      } else {
        console.error('bKash Execute Failed:', response);
        return res.redirect(`${config.frontend_url}/payment/failed`);
      }
    } catch (error: any) {
      console.error('bKash Callback Processing Error:', error);
      return res.redirect(`${config.frontend_url}/payment/failed`);
    }
  } else {
    // failure or cancel
    return res.redirect(`${config.frontend_url}/payment/failed`);
  }
};

