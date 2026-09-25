import { Types } from 'mongoose';

export interface TPurchaseItem {
    productId: Types.ObjectId;
    variantId?: Types.ObjectId | string; // Could be the specific variant SKU or ID if they use it
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface TPurchase {
    _id?: Types.ObjectId;
    supplierId: Types.ObjectId;
    reference: string;
    date: Date;
    status: 'Received' | 'Pending' | 'Ordered';
    items: TPurchaseItem[];
    subTotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: 'Paid' | 'Unpaid' | 'Overdue';
    chalanImage?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
