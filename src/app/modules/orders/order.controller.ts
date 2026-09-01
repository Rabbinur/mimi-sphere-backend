import { Request, Response } from 'express';
import { OrderServices } from './order.services';
import { generateOrderId } from '../../utils/generateOrderId';
import { BkashService } from '../bkash/bkash.service';
import { generateInvoicePDF } from '../../utils/generateInvoicePDF';
import { generatePolyLabelPDF } from '../../utils/generatePolyLabelPDF';
import { sendFBEvent } from '../../utils/facebookConversions';
import { sendGAEvent } from '../../utils/googleAnalytics';
import { Product } from '../products/product.model';
import { CheckoutLeadServices } from '../checkout-lead/checkout-lead.services';
import JwtHelpers from '../../helpers/jwtHelpers';
import config from '../../config';
import { Secret } from 'jsonwebtoken';
import logger from '../../utils/logger';

/* ================= CREATE ORDER ================= */
const createOrder = async (req: Request, res: Response) => {
  try {
    const order_id = await generateOrderId();

    const payload = {
      ...req.body,
      order_id,
      payment_status: 'pending',
      order_status: 'pending',
      tracking_data: {
        fbc: req.body.tracking_data?.fbc || req.cookies?.['_fbc'],
        fbp: req.body.tracking_data?.fbp || req.cookies?.['_fbp'],
        external_id: req.body.tracking_data?.external_id,
        ip: req.ip,
        user_agent: req.headers['user-agent'] as string,
      }
    };

    // Resolve product SKUs from DB
    const productIds = payload.products.map((p: any) => p.product_id);
    const productsFromDb = await Product.find({ _id: { $in: productIds } }).lean();
    const skuMap = new Map(productsFromDb.map((p: any) => [String(p._id), p.sku]));

    const contentIds = payload.products.map((p: any) => {
      const sku = skuMap.get(String(p.product_id));
      return sku || String(p.product_id);
    });

    const contents = payload.products.map((p: any) => {
      const sku = skuMap.get(String(p.product_id));
      return {
        id: sku || String(p.product_id),
        quantity: p.quantity,
        item_price: p.price,
      };
    });

    // If Online Payment, initiate bKash first
    if (payload.payment_method === 'ONLINE') {
      const bkashPayload = {
        mode: '0011', // immediate sale
        payerReference: payload.phone,
        callbackURL: `${req.protocol}://${req.get(
          'host',
        )}/api/v1/bkash/callback`,
        amount: payload.total_price.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: `${order_id}_${Date.now()}`,
      };

      try {
        const bkashRes = await BkashService.createPayment(bkashPayload);

        if (bkashRes && bkashRes.bkashURL) {
          // Success: Now create order in DB
          const result = await OrderServices.createOrderIntoDB(payload);

          // Mark lead as converted
          CheckoutLeadServices.convertLead(
            req.body.checkoutSessionId,
            payload.phone,
            result._id
          ).catch((err) => console.error('Failed to convert checkout lead:', err));

          // Send Google Analytics begin_checkout Event
          sendGAEvent({
            eventName: 'begin_checkout',
            clientId: req.cookies?.['_ga'] || 'anonymous',
            params: {
              items: payload.products.map((p: any) => ({
                item_id: p.product_id,
                item_name: p.title,
                price: p.price,
                quantity: p.quantity,
              })),
              value: payload.total_price,
              currency: 'BDT',
            },
          });

          return res.status(201).json({
            success: true,
            message: 'Order initiated',
            data: result,
            bkashURL: bkashRes.bkashURL,
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Failed to initiate bKash payment',
            details: bkashRes,
          });
        }
      } catch (bkashErr: any) {
        return res.status(400).json({
          success: false,
          message: 'bKash integration error',
          error: bkashErr.message,
          details: bkashErr.response?.data,
        });
      }
    }

    // Standard COD Flow
    const result = await OrderServices.createOrderIntoDB(payload);

    // Mark lead as converted
    CheckoutLeadServices.convertLead(
      req.body.checkoutSessionId,
      payload.phone,
      result._id
    ).catch((err) => console.error('Failed to convert checkout lead:', err));

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: result,
    });

    // Send Google Analytics purchase Event (COD)
    // Removed FB Purchase event here; will fire when order status is processing
    sendGAEvent({
      eventName: 'purchase',
      clientId: req.cookies?.['_ga'] || 'anonymous',
      params: {
        transaction_id: order_id,
        value: payload.total_price,
        currency: 'BDT',
        items: payload.products.map((p: any) => ({
          item_id: p.product_id,
          item_name: p.title,
          price: p.price,
          quantity: p.quantity,
        })),
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= CREATE ORDER (ADMIN) ================= */
const createOrderAdmin = async (req: Request, res: Response) => {
  try {
    const order_id = await generateOrderId();

    const payload = {
      ...req.body,
      order_id,
      payment_status: req.body.payment_status || 'pending',
      order_status: req.body.order_status || 'pending',
    };

    const result = await OrderServices.createOrderIntoDB(payload);

    res.status(201).json({
      success: true,
      message: 'Admin Order created successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= MY ORDERS (WITH STATUS FILTER) ================= */
const myOrders = async (req: Request, res: Response) => {
  try {
    const email = req.user?.email;
    const { status } = req.query;

    const result = await OrderServices.getMyOrdersFromDB(
      email,
      status as string | undefined,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const handleGetAllOrders = async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;

    const result = await OrderServices.getAllOrdersFromDB(
      search as string | undefined,
      status as string | undefined,
    );

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= SINGLE ORDER ================= */
const singleOrder = async (req: Request, res: Response) => {
  try {
    const result = await OrderServices.getSingleOrderFromDB(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};
/* ================= SINGLE ORDER ================= */
const singleOrderByOrderId = async (req: Request, res: Response) => {
  try {
    const result = await OrderServices.getSingleOrderByOrderIdFromDB(
      req.params.order_id,
    );
    if (!result) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Determine if requester is authorized for full details (Admin or Order Owner)
    let isAuthorized = false;
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization) {
      const raw_token = req.headers.authorization;
      if (raw_token.startsWith('Bearer ')) {
        token = raw_token.split(' ')[1];
      } else {
        token = raw_token;
      }
    }

    if (token) {
      try {
        const decoded = JwtHelpers.verifyToken(token, config.jwt_access_secret as Secret);
        if (decoded) {
          if (decoded.role === 'admin' || decoded.email === result.email) {
            isAuthorized = true;
          }
        }
      } catch (err) {
        // Token verification failed, treat as guest
      }
    }

    // Resolve product SKUs for the returned data
    const productIds = result.products.map((p: any) => p.product_id);
    const productsFromDb = await Product.find({ _id: { $in: productIds } }).lean();
    const skuMap = new Map(productsFromDb.map((p: any) => [String(p._id), p.sku]));

    const mappedProducts = result.products.map((p: any) => ({
      product_id: p.product_id,
      sku: skuMap.get(String(p.product_id)) || p.product_id,
      title: p.title,
      price: p.price,
      quantity: p.quantity,
      total_price: p.total_price,
    }));

    if (isAuthorized) {
      // Return full order details
      const responseData = result.toObject ? result.toObject() : { ...result };
      responseData.products = mappedProducts;
      return res.status(200).json({ success: true, data: responseData });
    } else {
      // Return sanitized order details for tracking / analytics
      return res.status(200).json({
        success: true,
        data: {
          _id: result._id,
          order_id: result.order_id,
          total_price: result.total_price,
          currency: 'BDT',
          products: mappedProducts,
        },
      });
    }
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};

/* ================= CANCEL ORDER ================= */
const cancelOrder = async (req: Request, res: Response) => {
  try {
    const result = await OrderServices.cancelOrderFromDB(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Order canceled successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= UPDATE STATUS ================= */
const orderStatusUpdate = async (req: Request, res: Response) => {
  try {
    const { order_status, payment_status } = req.body;

    const result = await OrderServices.updateOrderStatusIntoDB(
      req.params.id,
      order_status,
      payment_status,
    );

    // If status is updated to processing, fire the Purchase event if not already fired
    if (order_status === 'processing' && !result.is_purchase_event_fired) {
      // Resolve product SKUs from DB
      const productIds = result.products.map((p: any) => p.product_id);
      const productsFromDb = await Product.find({ _id: { $in: productIds } }).lean();
      const skuMap = new Map(productsFromDb.map((p: any) => [String(p._id), p.sku]));

      const contentIds = result.products.map((p: any) => skuMap.get(String(p.product_id)) || String(p.product_id));
      const contents = result.products.map((p: any) => ({
        id: skuMap.get(String(p.product_id)) || String(p.product_id),
        quantity: p.quantity,
        item_price: p.price,
      }));

      const nameParts = (result.customer_name || '').trim().split(/\s+/);
      const fn = nameParts[0] || '';
      const ln = nameParts.slice(1).join(' ') || '';

      sendFBEvent({
        eventName: 'Purchase',
        eventId: result.order_id,
        userData: {
          em: result.email,
          ph: result.phone,
          client_ip_address: result.tracking_data?.ip,
          client_user_agent: result.tracking_data?.user_agent,
          fbc: result.tracking_data?.fbc,
          fbp: result.tracking_data?.fbp,
          external_id: result.tracking_data?.external_id,
          fn,
          ln,
          ct: result.district,
          st: result.upazila,
          country: 'bd',
        },
        customData: {
          content_ids: contentIds,
          content_type: 'product',
          value: result.total_price,
          currency: 'BDT',
          num_items: result.products.reduce((acc: number, p: any) => acc + p.quantity, 0),
          contents,
        },
        eventSourceUrl: `${config.frontend_url}/payment/success?orderId=${result.order_id}`,
      });

      // Update the order to mark purchase event as fired
      const { OrderModel, SuccessOrderModel } = await import('./order.model');
      const updated = await OrderModel.findByIdAndUpdate(result._id, { is_purchase_event_fired: true });
      if (!updated) {
        await SuccessOrderModel.findByIdAndUpdate(result._id, { is_purchase_event_fired: true });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= TRACK ORDER ================= */
const trackOrder = async (req: Request, res: Response) => {
  try {
    const { order_id, phone } = req.body;

    if (!order_id || !phone) {
      return res.status(400).json({
        success: false,
        message: 'order_id and phone are required',
      });
    }

    const result = await OrderServices.trackOrderFromDB(order_id, phone);

    res.status(200).json({
      success: true,
      message: 'Order found',
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= DOWNLOAD INVOICE ================= */
const downloadInvoice = async (req: Request, res: Response) => {
  try {
    const order = await OrderServices.getSingleOrderFromDB(req.params.id);

    // generateInvoicePDF will pipe the PDF directly to the response
    generateInvoicePDF(order as any, res);
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};

/* ================= DOWNLOAD POLY LABEL ================= */
const downloadPolyLabel = async (req: Request, res: Response) => {
  try {
    const order = await OrderServices.getSingleOrderFromDB(req.params.id);

    // generatePolyLabelPDF will pipe the PDF directly to the response
    generatePolyLabelPDF(order as any, res);
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};

/* ================= SEND TO STEADFAST ================= */
const sendToSteadfast = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await OrderServices.createSteadfastOrderIntoCourier(id);
    res.status(200).json({
      success: true,
      message: 'Order sent to Steadfast successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= SEND TO CARRYBEE ================= */
const sendToCarrybee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await OrderServices.createCarrybeeOrderIntoCourier(id);
    res.status(200).json({
      success: true,
      message: 'Order sent to Carrybee successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= CHECK FRAUD ================= */
const checkFraud = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const result = await OrderServices.checkFraudFromAPI(phone);
    res.status(200).json({
      success: true,
      message: 'Fraud check completed',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= CARRYBEE WEBHOOK ================= */
const handleCarrybeeWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body?.event;
    const secret = '40489fe0-9386-4fc9-8e92-2b2fcb9d451c';

    logger.info(`CarryBee Webhook received. Event: ${event}`);

    // 1. Initial Integration Verification
    if (event === 'webhook.integration') {
      const integrationHeader = req.headers['x-cb-webhook-integration-header'];
      if (integrationHeader !== secret) {
        logger.error(`CarryBee Webhook verification failed. Header secret: ${integrationHeader}`);
        return res.status(401).json({ error: 'Unauthorized integration header' });
      }
      logger.info('CarryBee Webhook verification successful.');
      res.setHeader('X-CB-Webhook-Integration-Header', secret);
      return res.status(202).send();
    }

    // 2. Webhook Event Request Signature Verification
    const signatureHeader = req.headers['x-carrybee-webhook-signature'];
    if (signatureHeader !== secret) {
      logger.error(`CarryBee Webhook signature verification failed. Signature: ${signatureHeader}`);
      return res.status(401).json({ error: 'Unauthorized signature header' });
    }

    // 3. Order Updates Processing
    if (event) {
      const success = await OrderServices.handleCarrybeeWebhookEvent(req.body);
      if (success) {
        logger.info(`CarryBee Webhook event '${event}' processed successfully.`);
      } else {
        logger.warn(`CarryBee Webhook event '${event}' failed to match an order.`);
      }
    }

    return res.status(200).send();
  } catch (error: any) {
    logger.error(`CarryBee Webhook Error: ${error.message}`);
    return res.status(400).send();
  }
};

const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await OrderServices.deleteOrderFromDB(id);
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const OrderController = {
  createOrder,
  myOrders,
  handleGetAllOrders,
  singleOrder,
  cancelOrder,
  orderStatusUpdate,
  trackOrder,
  singleOrderByOrderId,
  createOrderAdmin,
  downloadInvoice,
  downloadPolyLabel,
  sendToSteadfast,
  sendToCarrybee,
  checkFraud,
  handleCarrybeeWebhook,
  deleteOrder,
};
