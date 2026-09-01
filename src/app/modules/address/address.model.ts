import { Schema, model } from 'mongoose';
import { IAddress, AddressModel } from './address.interface';
import { schemaOptions } from '../../utils/schemaOptions';

const addressSchema = new Schema<IAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customer_name: { type: String, required: true },
    phone: { type: String, required: true },
    village_or_area: { type: String, required: true },
    upazila: { type: String, required: true },
    district: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    label: { type: String, default: 'Home' },
  },
  schemaOptions,
);

const Address = model<IAddress, AddressModel>('Address', addressSchema);
export default Address;
