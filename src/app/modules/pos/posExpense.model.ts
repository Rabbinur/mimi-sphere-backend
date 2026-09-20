import { Schema, model, Document } from 'mongoose';

export interface IPosExpense extends Document {
  title: string;
  amount: number;
  category: string;
  notes?: string;
  date: Date;
  created_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const posExpenseSchema = new Schema<IPosExpense>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      default: 'General',
      enum: [
        'General',
        'Rent',
        'Utilities',
        'Food & Refreshment',
        'Transport',
        'Salaries',
        'Supplies',
        'Maintenance',
        'Marketing',
        'Other',
      ],
    },
    notes: { type: String, default: '', trim: true },
    date: { type: Date, default: Date.now },
    created_by: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

export const PosExpense = model<IPosExpense>('PosExpense', posExpenseSchema);
