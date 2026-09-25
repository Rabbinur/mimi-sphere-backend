import { Types } from 'mongoose';

export interface TPaymentHistory {
    date: Date;
    amount: number;
    method?: string;
    reference?: string;
    note?: string;
}

export interface TSupplier {
    _id?: Types.ObjectId;
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
    totalPurchase: number;
    totalPaid: number;
    totalDue: number;
    paymentHistory: TPaymentHistory[];
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
