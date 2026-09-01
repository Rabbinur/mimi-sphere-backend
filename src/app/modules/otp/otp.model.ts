import { Schema, model } from 'mongoose';
import { IOTP, OTPModel } from './otp.interface';

const OtpSchema = new Schema<IOTP>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: Number,
    required: true,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Document will be auto-deleted after 600 seconds (10 minutes)
  },
});

const OTPRecords = model<IOTP, OTPModel>('Otp', OtpSchema);

export default OTPRecords;
