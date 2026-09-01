import { Schema, model, Types } from 'mongoose';
import { TCategory } from './category.interface';

const CategorySchema = new Schema<TCategory>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        description: { type: String },
        parent_category_id: { type: Types.ObjectId, ref: 'Category', default: null },
        imageUrl: { type: String },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

export const CategoryModel = model<TCategory>('Category', CategorySchema);
