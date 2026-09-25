import { Schema, model, Document } from 'mongoose';

export interface IMembershipSettings extends Document {
  silver_threshold: number;
  silver_discount: number;
  gold_threshold: number;
  gold_discount: number;
}

const membershipSettingsSchema = new Schema<IMembershipSettings>(
  {
    silver_threshold: { type: Number, default: 1000, min: 0 },
    silver_discount:  { type: Number, default: 5,    min: 0, max: 100 },
    gold_threshold:   { type: Number, default: 3500,  min: 0 },
    gold_discount:    { type: Number, default: 7,     min: 0, max: 100 },
  },
  { timestamps: true }
);

export const MembershipSettings = model<IMembershipSettings>(
  'MembershipSettings',
  membershipSettingsSchema
);
