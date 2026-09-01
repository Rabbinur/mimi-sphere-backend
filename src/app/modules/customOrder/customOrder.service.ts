import { CustomOrder } from './customOrder.model';
import { CustomOrderInput } from './customOrder.interface';
import { sendEmail } from '../../utils/sendEmail';

const createCustomOrder = async (payload: CustomOrderInput) => {
  const order = await CustomOrder.create(payload);

  // Send Email Notification to Admin
  const adminEmail = 'slsuyel@gmail.com';
  const subject = `New Custom Order Request: ${payload.productName || 'General'}`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #4f46e5;">New Custom Order Request</h2>
      <p><strong>Customer:</strong> ${payload.customerName}</p>
      <p><strong>Email:</strong> ${payload.customerEmail}</p>
      <p><strong>Phone:</strong> ${payload.customerPhone}</p>
      <p><strong>Product:</strong> ${payload.productName}</p>
      ${payload.purchaseUrl ? `<p><strong>URL:</strong> <a href="${payload.purchaseUrl}">${payload.purchaseUrl}</a></p>` : ''}
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p><strong>Request Details:</strong></p>
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
        ${payload.productDescription || 'No description provided.'}
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        Track this in your Admin Dashboard.
      </p>
    </div>
  `;

  sendEmail(
    adminEmail,
    subject,
    `New Custom Order from ${payload.customerName}`,
    html,
  ).catch(console.error);

  return order;
};

const getAllCustomOrders = async (search?: string) => {
  const query: any = {};

  if (search) {
    query.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { customerEmail: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }

  return CustomOrder.find(query).sort({ createdAt: -1 });
};

const getSingleCustomOrder = async (id: string) => {
  return CustomOrder.findById(id);
};

const updateOrderStatus = async (id: string, status: string) => {
  return CustomOrder.findByIdAndUpdate(id, { status }, { new: true });
};

export const CustomOrderService = {
  createCustomOrder,
  getAllCustomOrders,
  getSingleCustomOrder,
  updateOrderStatus,
};
