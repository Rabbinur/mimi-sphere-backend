import { Document, Model, Types } from 'mongoose';

export type IAddress = {
  user: Types.ObjectId;
  customer_name: string;
  phone: string;
  village_or_area: string;
  upazila: string;
  district: string;
  isDefault: boolean;
  label: string;
} & Document;

export type AddressModel = Model<IAddress, Record<string, unknown>>;
