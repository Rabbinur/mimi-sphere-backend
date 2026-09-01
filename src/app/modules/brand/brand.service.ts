import { Types } from 'mongoose';
import { TBrand } from './brand.interface';
import { BrandModel } from './brand.model';

const createBrand = async (
  brandData: Omit<TBrand, '_id' | 'createdAt' | 'updatedAt'>,
): Promise<TBrand & { _id: Types.ObjectId }> => {
  try {
    const brand = await BrandModel.create(brandData);
    return brand.toObject();
  } catch (error) {
    console.error('Error creating brand:', error);
    throw new Error('Database error while creating brand.');
  }
};

const getAllBrands = async (
  page?: string,
  limit?: string,
  searchTerm?: string,
): Promise<any> => {
  try {
    let brands;
    let total;
    const p = Number(page) || 1;
    const l = Number(limit) || 10;

    const query: any = {};
    if (searchTerm) {
      query.name = { $regex: searchTerm, $options: 'i' };
    }

    if (page && limit) {
      const skip = (p - 1) * l;

      [brands, total] = await Promise.all([
        BrandModel.find(query)
          .sort({ order: 1, createdAt: -1 })
          .skip(skip)
          .limit(l)
          .lean(),
        BrandModel.countDocuments(query),
      ]);
    } else {
      brands = await BrandModel.find(query)
        .sort({ order: 1, createdAt: -1 })
        .lean();
      total = brands.length;
    }

    return {
      brands,
      total,
      page: p,
      limit: l,
    };
  } catch (error) {
    console.error('Error getting all brands:', error);
    throw error;
  }
};

const getBrandById = async (id: string): Promise<TBrand | null> => {
  try {
    const brand = await BrandModel.findById(id);
    return brand || null;
  } catch (error) {
    console.error('Error getting brand:', error);
    return null;
  }
};

const getBrandBySlug = async (slug: string): Promise<TBrand | null> => {
  try {
    const brand = await BrandModel.findOne({ slug })
      .populate({
        path: 'featuredProducts',
        populate: {
          path: 'product_categories',
          model: 'Category'
        }
      })
      .populate('featuredBlogs');
    return brand;
  } catch (error) {
    console.error('Error getting brand by slug:', error);
    throw error;
  }
};

const updateBrand = async (
  brandId: string,
  brandData: Partial<TBrand>,
): Promise<TBrand | null> => {
  try {
    const updatedBrand = await BrandModel.findByIdAndUpdate(
      brandId,
      brandData,
      { new: true },
    );
    return updatedBrand;
  } catch (error) {
    console.error('Error updating brand:', error);
    throw error;
  }
};

const deleteBrand = async (
  brandId: string,
): Promise<TBrand | null> => {
  try {
    const deletedBrand = await BrandModel.findByIdAndDelete(brandId);
    return deletedBrand;
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
};

const updateBrandOrder = async (
  brandOrders: { id: string; order: number }[],
): Promise<void> => {
  try {
    const bulkOps = brandOrders.map((item) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(item.id) },
        update: { $set: { order: item.order } },
      },
    }));
    await BrandModel.bulkWrite(bulkOps);
  } catch (error) {
    console.error('Error updating brand order:', error);
    throw error;
  }
};

export const brandServices = {
  createBrand,
  getAllBrands,
  getBrandById,
  getBrandBySlug,
  updateBrand,
  deleteBrand,
  updateBrandOrder,
};
