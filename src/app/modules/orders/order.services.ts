import { OrderModel, SuccessOrderModel } from './order.model';
import axios from 'axios';
import mongoose from 'mongoose';
import { TOrder } from './order.interface';
import { Product } from '../products/product.model';
import { AppError } from '../../utils/errorHandler';
import { sendEmail } from '../../utils/sendEmail';
import { getOrderTemplate } from '../../utils/emailTemplates';
import CouponModel from '../coupon/coupon.model';
import { createInvoicePDFBuffer } from '../../utils/generateInvoicePDF';
import { CourierUtils } from './courier.utils';
import { CarrybeeUtils } from './carrybee.utils';
import logger from '../../utils/logger';

/* ================= HELPER FUNCTIONS FOR MULTIPLE COLLECTIONS ================= */
const moveOrder = async (order: any, targetModel: any) => {
  const orderObject = order.toObject ? order.toObject() : order;
  // Create in target model
  const newDoc = new targetModel(orderObject);
  await targetModel.deleteOne({ _id: order._id });
  await newDoc.save();
  // Delete from source model
  await order.constructor.deleteOne({ _id: order._id });
  return newDoc;
};

const saveAndSyncOrder = async (order: any) => {
  const isDelivered = order.order_status === 'delivered';
  const isCurrentlySuccessCollection = order.constructor.modelName === 'SuccessOrder';

  await order.save();

  if (isDelivered && !isCurrentlySuccessCollection) {
    return await moveOrder(order, SuccessOrderModel);
  } else if (!isDelivered && isCurrentlySuccessCollection) {
    return await moveOrder(order, OrderModel);
  }
  return order;
};

/* ================= CREATE ORDER ================= */
const createOrderIntoDB = async (payload: TOrder) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 0. Handle Coupon Validation and Usage
    if (payload.coupon) {
      const coupon = await CouponModel.findOne({
        code: payload.coupon,
        is_active: true,
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() },
      }).session(session);

      if (!coupon) {
        throw new AppError('Invalid or expired coupon', 400);
      }

      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        throw new AppError('Coupon usage limit reached', 400);
      }

      // Increment usage count atomically
      await CouponModel.findByIdAndUpdate(
        coupon._id,
        { $inc: { usage_count: 1 } },
        { session },
      );
    }

    for (const item of payload.products) {
      // 🟢 Skip database checks and stock reduction for custom/ad-hoc products
      if (item.product_id.startsWith('custom-')) {
        continue;
      }

      // 1. Check if product exists and get details for error message
      const product = await Product.findById(item.product_id)
        .populate('product_categories')
        .session(session);

      if (!product) {
        throw new AppError(`Product not found: ${item.product_id}`, 404);
      }

      // 1.1 Check if it's a pre-order product (either by flag or category)
      const isPreOrder =
        product.is_pre_order ||
        (product.product_categories as any[])?.some(
          (cat) => cat.slug === 'pre-order',
        );

      // 2. Atomic update: ensure quantity >= requested (Bypass for pre-orders)
      if (isPreOrder) {
        // For pre-orders, we allow placing orders even if stock is 0.
        // We still reduce stock if it's > 0, but we don't fail if it's not.
        if (product.quantity > 0) {
          await Product.updateOne(
            { _id: item.product_id },
            { $inc: { quantity: -Math.min(item.quantity, product.quantity) } },
            { session },
          );
        }
      } else {
        const updateResult = await Product.updateOne(
          { _id: item.product_id, quantity: { $gte: item.quantity } },
          { $inc: { quantity: -item.quantity } },
          { session },
        );

        if (updateResult.modifiedCount === 0) {
          throw new AppError(
            `Insufficient stock for ${product.product_title}`,
            400,
          );
        }
      }
    }

    const isDelivered = payload.order_status === 'delivered';
    const modelToUse = isDelivered ? SuccessOrderModel : OrderModel;
    const order = await modelToUse.create([payload], { session });

    await session.commitTransaction();
    session.endSession();

    const savedOrder = order[0];

    // Send emails only for Cash on Delivery orders
    if (payload.payment_method === 'COD') {
      await sendOrderConfirmationEmail(savedOrder);
    }

    return savedOrder;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/* ================= SEND ORDER CONFIRMATION EMAIL ================= */
const sendOrderConfirmationEmail = async (order: TOrder) => {
  // Generate Invoice PDF for Attachment
  const pdfBuffer = await createInvoicePDFBuffer(order).catch((err) => {
    console.error('Failed to generate PDF for email:', err);
    return null;
  });

  const attachments = pdfBuffer
    ? [
        {
          filename: `invoice_${order.order_id}.pdf`,
          content: pdfBuffer,
        },
      ]
    : [];

  // Send Order Confirmation Email to Customer
  if (order.email) {
    sendEmail(
      order.email,
      `Order Confirmed - #${order.order_id}`,
      `Your order #${order.order_id} has been placed successfully.`,
      getOrderTemplate(order),
      attachments,
    ).catch(console.error);
  }

  // Send Notification to Admin
  const adminEmail = 'slsuyel@gmail.com';
  sendEmail(
    adminEmail,
    `New Order Received - #${order.order_id}`,
    `A new order #${order.order_id} has been placed by ${order.customer_name}.`,
    getOrderTemplate(order),
    attachments,
  ).catch(console.error);
};

/* ================= MY ORDERS ================= */
const getMyOrdersFromDB = async (email: string, status?: string) => {
  const query: any = { email };

  if (status === 'success' || status === 'delivered') {
    return await SuccessOrderModel.find(query).sort({ createdAt: -1 });
  }

  if (status === 'others') {
    return await OrderModel.find(query).sort({ createdAt: -1 });
  }

  if (status) {
    query.order_status = status;
    return await OrderModel.find(query).sort({ createdAt: -1 });
  }

  const activeOrders = await OrderModel.find(query).sort({ createdAt: -1 });
  const successOrders = await SuccessOrderModel.find(query).sort({ createdAt: -1 });
  const allOrders = [...activeOrders, ...successOrders];
  allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return allOrders;
};

/* ================= GET ALL ORDERS (ADMIN) ================= */
const getAllOrdersFromDB = async (search?: string, status?: string) => {
  const query: any = {};

  if (search) {
    query.$or = [
      { customer_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { order_id: { $regex: search, $options: 'i' } },
    ];
  }

  if (status === 'success' || status === 'delivered') {
    return await SuccessOrderModel.find(query).sort({ createdAt: -1 });
  }

  if (status === 'others') {
    return await OrderModel.find(query).sort({ createdAt: -1 });
  }

  if (status) {
    query.order_status = status;
    return await OrderModel.find(query).sort({ createdAt: -1 });
  }

  const activeOrders = await OrderModel.find(query).sort({ createdAt: -1 });
  const successOrders = await SuccessOrderModel.find(query).sort({ createdAt: -1 });
  const allOrders = [...activeOrders, ...successOrders];
  allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return allOrders;
};

/* ================= SINGLE ORDER ================= */
const getSingleOrderFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid order id', 400);
  }

  let order = await OrderModel.findById(id);
  if (!order) {
    order = await SuccessOrderModel.findById(id);
  }
  if (!order) throw new AppError('Order not found', 404);

  return order;
};

/* ================= SINGLE ORDER BY ORDER_ID ================= */
const getSingleOrderByOrderIdFromDB = async (order_id: string) => {
  if (!order_id) {
    throw new AppError('Order ID is required', 400);
  }

  let order = await OrderModel.findOne({ order_id });
  if (!order) {
    order = await SuccessOrderModel.findOne({ order_id });
  }

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return order;
};

/* ================= CANCEL ORDER ================= */
const cancelOrderFromDB = async (id: string) => {
  let order = await OrderModel.findById(id);
  if (!order) {
    order = await SuccessOrderModel.findById(id);
  }
  if (!order) throw new AppError('Order not found', 404);

  if (order.order_status === 'delivered') {
    throw new AppError('Delivered order cannot be canceled', 400);
  }

  order.order_status = 'canceled';
  await saveAndSyncOrder(order);

  return order;
};

/* ================= UPDATE STATUS ================= */
const updateOrderStatusIntoDB = async (
  id: string,
  order_status: TOrder['order_status'],
  payment_status: TOrder['payment_status'],
) => {
  let order = await OrderModel.findById(id);
  if (!order) {
    order = await SuccessOrderModel.findById(id);
  }

  if (!order) throw new AppError('Order not found', 404);

  order.order_status = order_status;
  order.payment_status = payment_status;

  const updatedOrder = await saveAndSyncOrder(order);

  // Send Status Update Email
  if (updatedOrder.email) {
    sendEmail(
      updatedOrder.email,
      `Order Status Updated - #${updatedOrder.order_id}`,
      `Your order #${updatedOrder.order_id} status has been updated to ${order_status}.`,
      getOrderTemplate(updatedOrder),
    ).catch(console.error);
  }

  return updatedOrder;
};

/* ================= TRACK ORDER ================= */
const trackOrderFromDB = async (order_id: string, phone: string) => {
  let order = await OrderModel.findOne({
    order_id,
    phone,
  });

  if (!order) {
    order = await SuccessOrderModel.findOne({
      order_id,
      phone,
    });
  }

  if (!order) {
    throw new AppError(
      'Order not found with this Order ID and phone number',
      404,
    );
  }

  return order;
};

/* ================= STEADFAST COURIER ================= */
const createSteadfastOrderIntoCourier = async (orderId: string) => {
  let order = await OrderModel.findById(orderId);
  if (!order) {
    order = await SuccessOrderModel.findById(orderId);
  }
  if (!order) throw new AppError('Order not found', 404);

  const steadfastOrder = {
    invoice: order.order_id,
    recipient_name: order.customer_name,
    recipient_phone: order.phone,
    recipient_address: `${order.village_or_area}, ${order.upazila}, ${order.district}`,
    cod_amount: order.payment_method === 'COD' ? order.total_price : 0,
    note: order.notes,
  };

  const result = await CourierUtils.createOrder(steadfastOrder);

  if (result.status === 200) {
    order.courier_details = {
      consignment_id: result.consignment.consignment_id.toString(),
      tracking_code: result.consignment.tracking_code,
      status: result.consignment.status,
      courier_name: 'Steadfast',
    };
    order.order_status = 'shipped';
    await saveAndSyncOrder(order);
  } else {
    throw new AppError(
      result.message || 'Failed to create Steadfast order',
      400,
    );
  }

  return order;
};

/* ================= FRAUD CHECKER ================= */
const checkFraudFromAPI = async (phone: string) => {
  try {
    const response = await axios.post(
      'https://fraudchecker.xyz/api/fraud/check',
      {
        phone,
      },
    );
    return response.data;
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to check fraud', 400);
  }
};

/* ================= CARRYBEE COURIER ================= */
const createCarrybeeOrderIntoCourier = async (orderId: string) => {
  let order = await OrderModel.findById(orderId);
  if (!order) {
    order = await SuccessOrderModel.findById(orderId);
  }
  if (!order) throw new AppError('Order not found', 404);

  // 1. Get Store ID (Use the first active store)
  const storeRes = await CarrybeeUtils.getStores();
  const store =
    storeRes?.data?.stores?.find((s: any) => s.is_active) ||
    storeRes?.data?.stores?.[0];
  if (!store) throw new AppError('No active Carrybee store found', 400);

  // 2. Resolve Address Details
  const addressQuery = `${order.district}, ${order.upazila}`;
  const addressDetails = await CarrybeeUtils.getAddressDetails(addressQuery);

  // 3. Fallback to default city/zone if not found (Dhaka: 14)
  const city_id = addressDetails?.data?.city_id || 14;
  const zone_id = addressDetails?.data?.zone_id || 1; // Default to some zone

  const carrybeeOrder = {
    store_id: store.id,
    merchant_order_id: order.order_id,
    delivery_type: 1, // Normal
    product_type: 1, // Parcel
    recipient_phone: order.phone,
    recipient_name: order.customer_name,
    recipient_address: `${order.village_or_area}, ${order.upazila}, ${order.district}`,
    city_id,
    zone_id,
    item_weight: 500, // Default 500g
    item_quantity: order.products?.length || 1,
    collectable_amount: order.payment_method === 'COD' ? order.total_price : 0,
  };

  const result = await CarrybeeUtils.createOrder(carrybeeOrder);

  if (!result.error) {
    order.courier_details = {
      consignment_id: result.data.order.consignment_id,
      tracking_code: result.data.order.consignment_id, // Carrybee uses consignment_id as tracking
      status: 'Order Created',
      courier_name: 'Carrybee',
    };
    order.order_status = 'shipped';
    await saveAndSyncOrder(order);
  } else {
    throw new AppError(
      result.message || 'Failed to create Carrybee order',
      400,
    );
  }

  return result;
};

/* ================= STATE TRANSITION VALIDATION ================= */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'canceled'],
  processing: ['shipped', 'canceled'],
  shipped: ['out_for_delivery', 'delivered', 'failed_delivery', 'returned', 'canceled'],
  out_for_delivery: ['delivered', 'failed_delivery', 'returned', 'canceled'],
  failed_delivery: ['out_for_delivery', 'returned', 'canceled'],
  delivered: [],
  returned: [],
  canceled: [],
};

const isValidTransition = (currentStatus: string, nextStatus: string): boolean => {
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
};

/* ================= HANDLE CARRYBEE WEBHOOK ================= */
const handleCarrybeeWebhookEvent = async (payload: any) => {
  const event = payload.event;
  const consignment_id = payload.consignment_id || payload.order?.consignment_id;
  const merchant_order_id = payload.merchant_order_id || payload.order?.merchant_order_id;

  logger.info(`Processing CarryBee event. Consignment: ${consignment_id}, Merchant Order ID: ${merchant_order_id}, Event: ${event}`);

  let order;

  if (consignment_id) {
    order = await OrderModel.findOne({ 'courier_details.consignment_id': consignment_id });
    if (!order) {
      order = await SuccessOrderModel.findOne({ 'courier_details.consignment_id': consignment_id });
    }
  } else if (merchant_order_id) {
    order = await OrderModel.findOne({ order_id: merchant_order_id });
    if (!order) {
      order = await SuccessOrderModel.findOne({ order_id: merchant_order_id });
    }
  }

  if (!order) {
    logger.warn(`CarryBee Webhook: No order found matching consignment_id: ${consignment_id} or merchant_order_id: ${merchant_order_id}`);
    return false;
  }

  let newStatus = order.order_status;
  let newPaymentStatus = order.payment_status;

  switch (event) {
    // 1. Delivered / Partial Delivery
    case 'order.delivered':
    case 'Delivered':
    case 'order.partial-delivery':
    case 'Partial Delivery':
      newStatus = 'delivered';
      if (order.payment_method === 'COD') {
        newPaymentStatus = 'paid';
      }
      break;

    // 2. Paid status mapping
    case 'order.paid':
    case 'Paid':
      newPaymentStatus = 'paid';
      break;

    // 3. Out for delivery / On hold
    case 'order.assigned-for-delivery':
    case 'Assigned For Delivery':
    case 'order.delivery-on-hold':
    case 'Delivery On Hold':
      newStatus = 'out_for_delivery';
      break;

    // 4. Failed delivery
    case 'order.delivery-failed':
    case 'Delivery Failed':
    case 'order.pickup-failed':
    case 'Pickup Failed':
    case 'order.create-failed':
    case 'Order Create Failed':
      newStatus = 'failed_delivery';
      break;

    // 5. Canceled
    case 'order.pickup-cancelled':
    case 'Pickup Cancelled':
      newStatus = 'canceled';
      break;

    // 6. Returned / Returned to Merchant / Return stages
    case 'order.returned':
    case 'Returned':
    case 'order.returned-to-merchant':
    case 'Returned To Merchant':
    case 'order.returned-at-sorting':
    case 'Returned At Sorting':
    case 'order.returned-in-transit':
    case 'Returned In Transit':
    case 'order.paid-return':
    case 'Paid Return':
    case 'order.exchange':
    case 'Exchange':
      newStatus = 'returned';
      break;

    // 7. Shipped / In-Transit / Hub states
    case 'order.created':
    case 'order.updated':
    case 'order.pickup-requested':
    case 'order.assigned-for-pickup':
    case 'order.picked':
    case 'order.at-the-sorting-hub':
    case 'order.on-the-way-to-central-warehouse':
    case 'order.at-central-warehouse':
    case 'order.in-transit':
    case 'order.received-at-last-mile-hub':
      if (order.order_status === 'pending' || order.order_status === 'processing') {
        newStatus = 'shipped';
      }
      break;

    default:
      logger.warn(`CarryBee Webhook: Unhandled event code: ${event}`);
      break;
  }

  // State transition validation
  if (!isValidTransition(order.order_status, newStatus)) {
    logger.warn(`CarryBee Webhook: Rejected invalid status transition for order ${order.order_id} from '${order.order_status}' to '${newStatus}'`);
    return false;
  }

  const statusChanged = newStatus !== order.order_status;
  const paymentStatusChanged = newPaymentStatus !== order.payment_status;

  if (statusChanged || paymentStatusChanged || (order.courier_details && order.courier_details.status !== event)) {
    logger.info(`CarryBee Webhook updating order ${order.order_id}: status '${order.order_status}' -> '${newStatus}', payment status '${order.payment_status}' -> '${newPaymentStatus}'`);
    
    if (order.courier_details) {
      order.courier_details.status = event;
    }
    order.order_status = newStatus;
    order.payment_status = newPaymentStatus;

    await saveAndSyncOrder(order);

    // Send email notification on status change
    if (statusChanged && order.email) {
      sendEmail(
        order.email,
        `Order Status Updated - #${order.order_id}`,
        `Your order #${order.order_id} status has been updated to ${newStatus}.`,
        getOrderTemplate(order),
      ).catch(console.error);
    }
  }

  return true;
};

/* ================= HANDLE STEADFAST STATUS UPDATE ================= */
const handleSteadfastStatusUpdate = async (order: any, rawStatus: string) => {
  let newStatus = order.order_status;
  let newPaymentStatus = order.payment_status;

  const lowerStatus = rawStatus.toLowerCase();
  
  if (lowerStatus.includes('delivered')) {
    newStatus = 'delivered';
    if (order.payment_method === 'COD') {
      newPaymentStatus = 'paid';
    }
  } else if (lowerStatus.includes('cancelled') || lowerStatus.includes('canceled')) {
    newStatus = 'canceled';
  } else if (lowerStatus.includes('returned') || lowerStatus.includes('return')) {
    newStatus = 'returned';
  } else if (lowerStatus.includes('out_for_delivery')) {
    newStatus = 'out_for_delivery';
  } else if (lowerStatus.includes('hold')) {
    newStatus = 'failed_delivery';
  } else if (lowerStatus.includes('transit') || lowerStatus.includes('shipped') || lowerStatus.includes('pickup') || lowerStatus.includes('created')) {
    if (order.order_status === 'pending' || order.order_status === 'processing') {
      newStatus = 'shipped';
    }
  }

  if (!isValidTransition(order.order_status, newStatus)) {
    logger.warn(`Steadfast Sync: Rejected invalid transition for order ${order.order_id} from '${order.order_status}' to '${newStatus}'`);
    return;
  }

  const statusChanged = newStatus !== order.order_status;
  const paymentStatusChanged = newPaymentStatus !== order.payment_status;

  if (statusChanged || paymentStatusChanged || (order.courier_details && order.courier_details.status !== rawStatus)) {
    logger.info(`Steadfast Sync updating order ${order.order_id}: status '${order.order_status}' -> '${newStatus}', payment status '${order.payment_status}' -> '${newPaymentStatus}'`);
    
    if (order.courier_details) {
      order.courier_details.status = rawStatus;
    }
    order.order_status = newStatus;
    order.payment_status = newPaymentStatus;

    await saveAndSyncOrder(order);

    if (statusChanged && order.email) {
      sendEmail(
        order.email,
        `Order Status Updated - #${order.order_id}`,
        `Your order #${order.order_id} status has been updated to ${newStatus}.`,
        getOrderTemplate(order),
      ).catch(console.error);
    }
  }
};

/* ================= SCHEDULED COURIER STATUS SYNC ================= */
const syncCourierOrderStatus = async () => {
  logger.info('Starting scheduled courier order status synchronization...');

  const activeOrders = await OrderModel.find({
    order_status: { $in: ['shipped', 'out_for_delivery', 'failed_delivery'] },
    'courier_details.consignment_id': { $exists: true, $ne: null },
  });

  logger.info(`Found ${activeOrders.length} active orders to synchronize.`);

  for (const order of activeOrders) {
    try {
      const courierName = order.courier_details?.courier_name;
      const consignmentId = order.courier_details?.consignment_id;

      if (!consignmentId) continue;

      if (courierName === 'Carrybee') {
        logger.info(`Syncing CarryBee order ID ${order.order_id} (Consignment: ${consignmentId})`);
        const details = await CarrybeeUtils.getOrderDetails(consignmentId);
        
        const rawStatus = details?.data?.order?.status || details?.data?.status || details?.status;
        
        if (rawStatus) {
          logger.info(`Fetched status for CarryBee order ${order.order_id}: ${rawStatus}`);
          await handleCarrybeeWebhookEvent({
            event: rawStatus,
            consignment_id: consignmentId,
            merchant_order_id: order.order_id,
          });
        } else {
          logger.warn(`Could not extract status from CarryBee details for order ${order.order_id}`);
        }
      } else if (courierName === 'Steadfast') {
        logger.info(`Syncing Steadfast order ID ${order.order_id} (Tracking: ${consignmentId})`);
        const statusResponse = await CourierUtils.getOrderStatus(consignmentId);
        
        const rawStatus = statusResponse?.status;
        
        if (rawStatus) {
          logger.info(`Fetched status for Steadfast order ${order.order_id}: ${rawStatus}`);
          await handleSteadfastStatusUpdate(order, rawStatus);
        } else {
          logger.warn(`Could not extract status from Steadfast response for order ${order.order_id}`);
        }
      }
    } catch (err: any) {
      logger.error(`Error synchronizing order ${order.order_id}: ${err.message}`);
    }
  }

  logger.info('Finished scheduled courier order status synchronization.');
};

const deleteOrderFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid order id', 400);
  }
  let order = await OrderModel.findByIdAndDelete(id);
  if (!order) {
    order = await SuccessOrderModel.findByIdAndDelete(id);
  }
  if (!order) throw new AppError('Order not found', 404);
  return order;
};

/* ================= ONE-TIME DATA MIGRATION ================= */
const migrateExistingDeliveredOrders = async () => {
  try {
    logger.info('🔍 Checking for old delivered orders that need to be migrated to SuccessOrder collection...');
    
    // Find all orders in OrderModel that have status 'delivered'
    const deliveredOrders = await OrderModel.find({ order_status: 'delivered' });
    
    if (deliveredOrders.length === 0) {
      logger.info('✅ No pending delivered orders migration needed.');
      return;
    }

    logger.info(`🔄 Migrating ${deliveredOrders.length} delivered orders to SuccessOrder collection...`);

    let migratedCount = 0;
    for (const order of deliveredOrders) {
      const orderObject = order.toObject ? order.toObject() : order;
      // Write to SuccessOrderModel
      const newDoc = new SuccessOrderModel(orderObject);
      // Ensure we don't cause duplicate keys in target
      await SuccessOrderModel.deleteOne({ _id: order._id });
      await newDoc.save();
      // Remove from OrderModel
      await OrderModel.deleteOne({ _id: order._id });
      migratedCount++;
    }

    logger.info(`🎉 Successfully migrated ${migratedCount} delivered orders to SuccessOrder collection.`);
  } catch (error: any) {
    logger.error(`❌ Error migrating delivered orders: ${error.message}`);
  }
};

export const OrderServices = {
  createOrderIntoDB,
  getMyOrdersFromDB,
  getAllOrdersFromDB,
  getSingleOrderFromDB,
  cancelOrderFromDB,
  updateOrderStatusIntoDB,
  getSingleOrderByOrderIdFromDB,
  trackOrderFromDB,
  createSteadfastOrderIntoCourier,
  createCarrybeeOrderIntoCourier,
  checkFraudFromAPI,
  sendOrderConfirmationEmail,
  handleCarrybeeWebhookEvent,
  syncCourierOrderStatus,
  deleteOrderFromDB,
  migrateExistingDeliveredOrders,
};

