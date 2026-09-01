import { Types } from 'mongoose';
import { TCategory } from './category.interface';
import { CategoryModel } from './category.model';
const createCategory = async (
  categoryData: Omit<TCategory, '_id' | 'createdAt' | 'updatedAt'>,
): Promise<TCategory & { _id: Types.ObjectId }> => {
  try {
    const category = await CategoryModel.create(categoryData);
    return category.toObject();
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Database error while creating category.');
  }
};

const getAllCategories = async (subCategory: boolean): Promise<TCategory[]> => {
  try {
    const categories: TCategory[] = await CategoryModel.find()
      .select('_id name slug description  imageUrl isActive createdAt order ')
      .sort({ order: 1, createdAt: 1 })
      .lean();
    if (subCategory == false) {
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

    return rootCategories;
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
  categoryData: TCategory,
): Promise<TCategory | null> => {
  try {
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
    const category = await CategoryModel.findOne({ slug, isActive: true });
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
    const bulkOps = categoryOrders.map((item) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(item.id) },
        update: { $set: { order: item.order } },
      },
    }));
    await CategoryModel.bulkWrite(bulkOps);
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
