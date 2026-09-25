import { Schema, model } from 'mongoose';
import { TSupplier, TPaymentHistory } from './supplier.interface';

const PaymentHistorySchema = new Schema<TPaymentHistory>({
    date: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true },
    method: { type: String },
    reference: { type: String },
    note: { type: String }
});

const SupplierSchema = new Schema<TSupplier>(
    {
        name: { type: String, required: true, unique: true },
        contactPerson: { type: String },
        phone: { type: String, required: true },
        email: { type: String },
        address: { type: String },
        totalPurchase: { type: Number, default: 0 },
        totalPaid: { type: Number, default: 0 },
        totalDue: { type: Number, default: 0 },
        paymentHistory: [PaymentHistorySchema],
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true,
    }
);

export const SupplierModel = model<TSupplier>('Supplier', SupplierSchema);
