import { IAddress } from './address.interface';
import Address from './address.model';
import ApiError from '../../middlewares/error';
import { HttpStatusCode } from '../../../lib/httpStatus';

class Service {
  async createAddress(user_id: string, payload: Partial<IAddress>) {
    payload.user = user_id as any;
    
    // If setting as default, unset other defaults
    if (payload.isDefault) {
      await Address.updateMany({ user: user_id }, { isDefault: false });
    } else {
      // If this is the first address, make it default
      const count = await Address.countDocuments({ user: user_id });
      if (count === 0) payload.isDefault = true;
    }

    const result = await Address.create(payload);
    return result;
  }

  async getUserAddresses(user_id: string) {
    const result = await Address.find({ user: user_id });
    return result;
  }

  async updateAddress(id: string, user_id: string, payload: Partial<IAddress>) {
    const isExist = await Address.findOne({ _id: id, user: user_id });
    if (!isExist) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, 'Address not found');
    }

    if (payload.isDefault) {
      await Address.updateMany({ user: user_id, _id: { $ne: id } }, { isDefault: false });
    }

    const result = await Address.findOneAndUpdate(
      { _id: id, user: user_id },
      { $set: payload },
      { new: true }
    );
    return result;
  }

  async deleteAddress(id: string, user_id: string) {
    const isExist = await Address.findOne({ _id: id, user: user_id });
    if (!isExist) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, 'Address not found');
    }
    
    const result = await Address.findOneAndDelete({ _id: id, user: user_id });
    
    // If the deleted address was default, make another one default
    if (isExist.isDefault) {
      const remainingAddress = await Address.findOne({ user: user_id });
      if (remainingAddress) {
        remainingAddress.isDefault = true;
        await remainingAddress.save();
      }
    }
    
    return result;
  }
}

export const AddressService = new Service();
