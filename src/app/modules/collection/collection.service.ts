import { Types } from 'mongoose';
import { TCollection } from './collection.interface';
import { CollectionModel } from './collection.model';
import { Product } from '../products/product.model';

const createCollection = async (
  collectionData: Omit<TCollection, '_id' | 'createdAt' | 'updatedAt'>,
): Promise<TCollection> => {
  const collection = await CollectionModel.create(collectionData);
  return collection.toObject();
};

const getAllCollections = async (
  page?: string,
  limit?: string,
  searchTerm?: string,
): Promise<any> => {
  const p = Number(page) || 1;
  const l = Number(limit) || 10;
  const query: any = {};

  if (searchTerm) {
    query.name = { $regex: searchTerm, $options: 'i' };
  }

  let collections;
  let total;

  if (page && limit) {
    const skip = (p - 1) * l;
    [collections, total] = await Promise.all([
      CollectionModel.find(query)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean(),
      CollectionModel.countDocuments(query),
    ]);
  } else {
    collections = await CollectionModel.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
    total = collections.length;
  }

  return {
    collections,
    total,
    page: p,
    limit: l,
  };
};

const getCollectionById = async (id: string): Promise<TCollection | null> => {
  const collection = await CollectionModel.findById(id).populate('manualProducts');
  return collection || null;
};

const getCollectionBySlug = async (slug: string): Promise<any | null> => {
  const collection = await CollectionModel.findOne({ slug });
  if (!collection) return null;

  let products: any[] = [];
  if (collection.productSelectionMode === 'automatic') {
    const filterQuery: any = { product_status: 'active' };

    if (collection.automaticFilters) {
      const { brands, categories, tags } = collection.automaticFilters;
      const andConditions: any[] = [];

      if (brands && brands.length > 0) {
        andConditions.push({ product_vendor: { $in: brands } });
      }
      if (categories && categories.length > 0) {
        const categoryIds = categories.map(cat => new Types.ObjectId(cat.toString()));
        andConditions.push({ product_categories: { $in: categoryIds } });
      }
      if (tags && tags.length > 0) {
        const tagConditions = tags.map(tag => ({
          $or: [
            { 'product_attributes.value': { $regex: tag, $options: 'i' } },
            { product_title: { $regex: tag, $options: 'i' } }
          ]
        }));
        andConditions.push({ $or: tagConditions });
      }

      if (andConditions.length > 0) {
        filterQuery.$and = andConditions;
      }
    }

    products = await Product.find(filterQuery).populate('product_categories').lean();
  } else {
    // Populate manual products
    const populated = await CollectionModel.findById(collection._id).populate({
      path: 'manualProducts',
      populate: {
        path: 'product_categories',
        model: 'Category'
      }
    });
    products = populated?.manualProducts || [];
  }

  const collectionObj = collection.toObject();
  return {
    ...collectionObj,
    products,
  };
};

const updateCollection = async (
  collectionId: string,
  collectionData: Partial<TCollection>,
): Promise<TCollection | null> => {
  const updatedCollection = await CollectionModel.findByIdAndUpdate(
    collectionId,
    collectionData,
    { new: true },
  );
  return updatedCollection;
};

const deleteCollection = async (
  collectionId: string,
): Promise<TCollection | null> => {
  const deletedCollection = await CollectionModel.findByIdAndDelete(collectionId);
  return deletedCollection;
};

export const collectionServices = {
  createCollection,
  getAllCollections,
  getCollectionById,
  getCollectionBySlug,
  updateCollection,
  deleteCollection,
};
