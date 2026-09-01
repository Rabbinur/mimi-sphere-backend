import CouponModel from './coupon.model';
import { TCoupon } from './coupon.interface';

const create = async (data: TCoupon) => {
    const coupon = new CouponModel(data);
    await coupon.save();
    return coupon;
};

const getAll = async () => {
    return await CouponModel.find();
};

const getById = async (id: string) => {
    return await CouponModel.findById(id);
};

const update = async (id: string, data: TCoupon) => {
    return await CouponModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

const remove = async (id: string) => {
    return await CouponModel.findByIdAndDelete(id);
};

const getCouponByCode = async (code: string) => {
    return await CouponModel.findOne({ code: code });
};

const incrementCouponUsage = async (code: string) => {
    return await CouponModel.findOneAndUpdate({ code: code }, { $inc: { usage_count: 1 } }, { new: true });
};


export const CouponServices = {
    create,
    getAll,
    getById,
    update,
    remove,
    getCouponByCode,
    incrementCouponUsage
};
