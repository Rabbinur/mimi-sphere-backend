import { Schema, model } from 'mongoose';
import { IUser, UserModel } from './user.interface';
import { roles } from './user.constant';
import { schemaOptions } from '../../utils/schemaOptions';

// User Schema
const userSchema = new Schema<IUser>(
  {
    // required field to register a user
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },

    // optional field for register
    photo: { type: String },
    role: { type: String, enum: roles, default: 'USER' },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
  },
  schemaOptions,
);

const User = model<IUser, UserModel>('User', userSchema);
export default User;
