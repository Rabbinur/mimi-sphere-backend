import { Schema, model } from 'mongoose';
import { TBrand } from './brand.interface';

const BrandSchema = new Schema<TBrand>(
    {
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        logoUrl: { type: String },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        // CMS Fields
        heroTitle: { type: String },
        heroDescription: { type: String },
        coverImage: { type: String },
        content: { type: String },
        // SEO
        metaTitle: { type: String },
        metaDescription: { type: String },
        metaKeywords: { type: String },
        ogImage: { type: String },
        // FAQs
        FAQs: [
            {
                question: { type: String },
                answer: { type: String }
            }
        ],
        // Merchandising
        featuredProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
        featuredBlogs: [{ type: Schema.Types.ObjectId, ref: 'Blog' }],
        // Settings
        displayOrder: { type: Number, default: 0 },
        isFeatured: { type: Boolean, default: false }
    },
    {
        timestamps: true,
    }
);

export const BrandModel = model<TBrand>('Brand', BrandSchema);
