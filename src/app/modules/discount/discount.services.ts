import DiscountModel from './discount.model';
import { IDiscount, IDiscountQuery } from './discount.interface';

const SEED_DISCOUNTS = [
  {
    name: 'Weekend Deal',
    discount_type: 'percentage',
    discount_value: 70,
    discount_plan: 'Standard',
    valid_from: new Date('2026-05-22'),
    valid_to: new Date('2026-06-24'),
    days: ['Sat', 'Sun'],
    customer_group: 'All',
    apply_to: 'all',
    products: [],
    is_active: true,
    status: 'Active',
  },
  {
    name: 'Loyalty Reward',
    discount_type: 'flat',
    discount_value: 40,
    discount_plan: 'Membership',
    valid_from: new Date('2026-04-16'),
    valid_to: new Date('2026-05-16'),
    days: ['Mon', 'Tue', 'Thu', 'Fri'],
    customer_group: 'Membership',
    apply_to: 'specific',
    products: [],
    is_active: true,
    status: 'Active',
  },
  {
    name: 'Flash Sale',
    discount_type: 'percentage',
    discount_value: 60,
    discount_plan: 'Standard',
    valid_from: new Date('2026-03-20'),
    valid_to: new Date('2026-04-20'),
    days: ['Thu', 'Fri', 'Sat', 'Sun'],
    customer_group: 'All',
    apply_to: 'all',
    products: [],
    is_active: true,
    status: 'Active',
  },
  {
    name: 'Super Saver',
    discount_type: 'percentage',
    discount_value: 80,
    discount_plan: 'Standard',
    valid_from: new Date('2026-02-15'),
    valid_to: new Date('2026-04-15'),
    days: ['Mon', 'Tue', 'Wed'],
    customer_group: 'All',
    apply_to: 'all',
    products: [],
    is_active: true,
    status: 'Active',
  },
  {
    name: 'Surprise Savings',
    discount_type: 'flat',
    discount_value: 50,
    discount_plan: 'Standard',
    valid_from: new Date('2026-01-24'),
    valid_to: new Date('2026-03-24'),
    days: ['Sat', 'Sun', 'Mon'],
    customer_group: 'Standard',
    apply_to: 'specific',
    products: [],
    is_active: true,
    status: 'Active',
  },
];

export class DiscountServices {
  static async create(payload: Partial<IDiscount>) {
    if (payload.apply_to === 'all') {
      payload.products = [];
    }
    const discount = await DiscountModel.create(payload);
    return discount;
  }

  static async getAll(query: IDiscountQuery) {
    // Seed initial data if collection is completely empty
    const count = await DiscountModel.countDocuments();
    if (count === 0) {
      await DiscountModel.insertMany(SEED_DISCOUNTS);
    }

    const filter: Record<string, any> = {};

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    if (query.status && query.status !== 'All') {
      filter.status = query.status;
    }

    if (query.customer && query.customer !== 'All') {
      filter.customer_group = query.customer;
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await DiscountModel.countDocuments(filter);
    const discounts = await DiscountModel.find(filter)
      .populate('products', 'product_title thumbnail product_price sku barcode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      data: discounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getById(id: string) {
    return await DiscountModel.findById(id).populate(
      'products',
      'product_title thumbnail product_price sku barcode'
    );
  }

  static async update(id: string, payload: Partial<IDiscount>) {
    if (payload.apply_to === 'all') {
      payload.products = [];
    }
    return await DiscountModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
  }

  static async delete(id: string) {
    return await DiscountModel.findByIdAndDelete(id);
  }

  static async getActiveDiscounts(productId?: string) {
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDay = dayNames[now.getDay()];

    const query: Record<string, any> = {
      is_active: true,
      valid_from: { $lte: now },
      valid_to: { $gte: now },
    };

    const allActive = await DiscountModel.find(query).populate(
      'products',
      'product_name slug sku pricing inventory'
    );

    // Filter by matching day or 'All Days'
    const matchingDay = allActive.filter((d) => {
      if (!d.days || d.days.length === 0 || d.days.includes('All Days')) return true;
      return d.days.includes(currentDay);
    });

    if (!productId) {
      return matchingDay;
    }

    // Return discounts that apply either to ALL products or this specific product
    return matchingDay.filter((d) => {
      if (d.apply_to === 'all') return true;
      return d.products?.some((p: any) => p._id?.toString() === productId);
    });
  }
}
