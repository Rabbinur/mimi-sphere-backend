import { OrderModel, SuccessOrderModel } from '../modules/orders/order.model';

export const generateOrderId = async () => {
  const now = new Date();

  const month = String(now.getMonth() + 1).padStart(2, '0'); // 03
  const year = String(now.getFullYear()).slice(-2); // 24
  const key = `${year}${month}`; // 2403

  // last order of this month in both collections
  const lastOrderActive = await OrderModel.findOne({
    order_id: { $regex: `^ORD-${key}` },
  })
    .sort({ createdAt: -1 })
    .select('order_id');

  const lastOrderSuccess = await SuccessOrderModel.findOne({
    order_id: { $regex: `^ORD-${key}` },
  })
    .sort({ createdAt: -1 })
    .select('order_id');

  let lastSeq = 0;

  if (lastOrderActive?.order_id) {
    lastSeq = Math.max(lastSeq, parseInt(lastOrderActive.order_id.slice(-3), 10));
  }
  if (lastOrderSuccess?.order_id) {
    lastSeq = Math.max(lastSeq, parseInt(lastOrderSuccess.order_id.slice(-3), 10));
  }

  const nextSeq = lastSeq + 1;

  return `ORD-${key}${String(nextSeq).padStart(3, '0')}`;
};
