import { Types } from 'mongoose';
import { TCategory } from './category.interface';
import { CategoryModel } from './category.model';
const createCategory = async (
  categoryData: Omit<TCategory, '_id' | 'createdAt' | 'updatedAt'>,
): Promise<TCategory & { _id: Types.ObjectId }> => {
  try {
    if (typeof categoryData.order !== 'number' || isNaN(categoryData.order) || categoryData.order <= 0) {
      const maxOrderCategory = await CategoryModel.findOne({ order: { $exists: true, $gt: 0 } })
        .sort({ order: -1 })
        .select('order')
        .lean();
      const nextOrder = (maxOrderCategory?.order && typeof maxOrderCategory.order === 'number')
        ? maxOrderCategory.order + 1
        : 1;
      categoryData.order = nextOrder;
    }

    const category = await CategoryModel.create(categoryData);
    return category.toObject();
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Database error while creating category.');
  }
};

const sortCategoriesByOrder = <T extends { order?: number; createdAt?: Date | string }>(list: T[]): T[] => {
  const getOrder = (item: T) =>
    typeof item.order === 'number' && !isNaN(item.order) && item.order > 0
      ? item.order
      : Number.MAX_SAFE_INTEGER;

  return list.sort((a, b) => {
    const orderA = getOrder(a);
    const orderB = getOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
};

const getAllCategories = async (
  subCategory: boolean,
  isActive?: boolean,
  showInNavbar?: boolean,
): Promise<TCategory[]> => {
  try {
    const andConditions: any[] = [];
    if (isActive === true) {
      andConditions.push({ $or: [{ isActive: true }, { isActive: { $exists: false } }] });
    } else if (isActive === false) {
      andConditions.push({ isActive: false });
    }

    if (showInNavbar === true) {
      andConditions.push({ $or: [{ showInNavbar: true }, { showInNavbar: { $exists: false } }] });
    } else if (showInNavbar === false) {
      andConditions.push({ showInNavbar: false });
    }

    const filter: Record<string, any> = andConditions.length > 0 ? { $and: andConditions } : {};

    const rawCategories: TCategory[] = await CategoryModel.find(filter)
      .select('_id name slug description imageUrl bannerImage parent_category_id isActive showInNavbar createdAt order')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const categories = sortCategoriesByOrder(rawCategories);

    if (subCategory === false) {
      return categories;
    }

    const categoryMap: Record<
      string,
      TCategory & { sub_categories: TCategory[] }
    > = {};
    categories.forEach((category) => {
      categoryMap[category._id!.toString()] = {
        ...category,
        sub_categories: [],
      };
    });

    const rootCategories: TCategory[] = [];
    categories.forEach((category) => {
      if (category.parent_category_id) {
        const parentId = category.parent_category_id.toString();
        if (categoryMap[parentId]) {
          categoryMap[parentId].sub_categories.push(
            categoryMap[category._id!.toString()],
          );
        }
      } else {
        rootCategories.push(categoryMap[category._id!.toString()]);
      }
    });

    // Ensure sub_categories in each root category are also sorted by order
    rootCategories.forEach((root) => {
      if (root.sub_categories && root.sub_categories.length > 0) {
        root.sub_categories = sortCategoriesByOrder(root.sub_categories);
      }
    });

    return sortCategoriesByOrder(rootCategories);
  } catch (error) {
    console.error('Error getting all categories:', error);
    throw error;
  }
};

const getCategoryById = async (id: string): Promise<TCategory | null> => {
  try {
    const category = await CategoryModel.findById(id);
    return category || null;
  } catch (error) {
    console.error('Error getting category:', error);
    return null;
  }
};

const updateCategory = async (
  categoryId: string,
  categoryData: Partial<TCategory>,
): Promise<TCategory | null> => {
  try {
    const existing = await CategoryModel.findById(categoryId);
    if (!existing) return null;

    const rawNewOrder = categoryData.order;
    if (typeof rawNewOrder === 'number' && rawNewOrder > 0) {
      const newOrder = Math.floor(rawNewOrder);
      categoryData.order = newOrder;
      const oldOrder = typeof existing.order === 'number' && existing.order > 0 ? existing.order : 0;

      const parentId = categoryData.parent_category_id !== undefined
        ? categoryData.parent_category_id
        : existing.parent_category_id;

      const parentFilter = parentId
        ? { parent_category_id: new Types.ObjectId(parentId.toString()) }
        : { $or: [{ parent_category_id: null }, { parent_category_id: { $exists: false } }] };

      if (oldOrder <= 0 || newOrder === oldOrder) {
        // Shift conflicting categories with order >= newOrder by +1
        await CategoryModel.updateMany(
          {
            _id: { $ne: existing._id },
            ...parentFilter,
            order: { $gte: newOrder },
          },
          { $inc: { order: 1 } },
        );
      } else if (newOrder < oldOrder) {
        // Moving UP: shift categories in [newOrder, oldOrder - 1] by +1
        await CategoryModel.updateMany(
          {
            _id: { $ne: existing._id },
            ...parentFilter,
            order: { $gte: newOrder, $lt: oldOrder },
          },
          { $inc: { order: 1 } },
        );
      } else if (newOrder > oldOrder) {
        // Moving DOWN: shift categories in [oldOrder + 1, newOrder] by -1
        await CategoryModel.updateMany(
          {
            _id: { $ne: existing._id },
            ...parentFilter,
            order: { $gt: oldOrder, $lte: newOrder },
          },
          { $inc: { order: -1 } },
        );
      }
    }

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      categoryData,
      { new: true },
    );
    return updatedCategory;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

const deleteCategory = async (
  categoryId: string,
): Promise<TCategory | null> => {
  try {
    const deletedCategory = await CategoryModel.findByIdAndDelete(categoryId);
    return deletedCategory;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};
const getCategoryBySlug = async (slug: string): Promise<TCategory | null> => {
  try {
    const category = await CategoryModel.findOne({
      slug,
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    });
    return category || null;
  } catch (error) {
    console.error('Error getting category by slug:', error);
    throw new Error('Database error while fetching category by slug.');
  }
};

const updateCategoryOrder = async (
  categoryOrders: { id: string; order: number }[],
): Promise<void> => {
  try {
    if (!Array.isArray(categoryOrders) || categoryOrders.length === 0) {
      return;
    }

    const validOps = categoryOrders
      .filter(
        (item) =>
          item &&
          item.id &&
          Types.ObjectId.isValid(item.id) &&
          typeof item.order === 'number' &&
          !isNaN(item.order) &&
          item.order >= 0,
      )
      .map((item) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(item.id) },
          update: { $set: { order: Math.floor(item.order) } },
        },
      }));

    if (validOps.length > 0) {
      await CategoryModel.bulkWrite(validOps);
    }
  } catch (error) {
    console.error('Error updating category order:', error);
    throw error;
  }
};

export const categoryServices = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryBySlug,
  updateCategoryOrder,
};
