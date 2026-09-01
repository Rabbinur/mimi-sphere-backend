import { Schema, model } from 'mongoose';
import { TCollection } from './collection.interface';

const CollectionSchema = new Schema<TCollection>(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        isActive: { type: Boolean, default: true },
        displayOrder: { type: Number, default: 0 },
        // Content
        heroTitle: { type: String },
        heroDescription: { type: String },
        bannerImage: { type: String },
        content: { type: String },
        // SEO
        metaTitle: { type: String },
        metaDescription: { type: String },
        metaKeywords: { type: String },
        ogImage: { type: String },
        // Product Selection
        productSelectionMode: { type: String, enum: ['manual', 'automatic'], default: 'manual', required: true },
        manualProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
        automaticFilters: {
            brands: [{ type: String }],
            categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
            tags: [{ type: String }]
        },
        // FAQs
        FAQs: [
            {
                question: { type: String },
                answer: { type: String }
            }
        ]
    },
    {
        timestamps: true,
    }
);

export const CollectionModel = model<TCollection>('Collection', CollectionSchema);
