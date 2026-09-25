import { Schema, model } from 'mongoose';
import { TPurchase, TPurchaseItem } from './purchase.interface';

const PurchaseItemSchema = new Schema<TPurchaseItem>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.Mixed },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
});

const PurchaseSchema = new Schema<TPurchase>(
    {
        supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
        reference: { type: String, required: true },
        date: { type: Date, required: true, default: Date.now },
        status: { type: String, enum: ['Received', 'Pending', 'Ordered'], default: 'Received' },
        items: [PurchaseItemSchema],
        subTotal: { type: Number, required: true, min: 0 },
        discount: { type: Number, default: 0, min: 0 },
        tax: { type: Number, default: 0, min: 0 },
        grandTotal: { type: Number, required: true, min: 0 },
        paidAmount: { type: Number, required: true, min: 0 },
        dueAmount: { type: Number, required: true, min: 0 },
        paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Overdue'], default: 'Paid' },
        chalanImage: { type: String },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true,
    }
);

export const PurchaseModel = model<TPurchase>('Purchase', PurchaseSchema);
