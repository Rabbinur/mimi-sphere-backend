import { Document, Model } from 'mongoose';
import { IRoles } from './user.constant';

export type IUser = {
  name: string;
  phone: string;
  email: string;
  photo?: string;
  role: IRoles;
  password: string;
  isVerified: boolean;
} & Document;

export type UserModel = Model<IUser, Record<string, unknown>>;
