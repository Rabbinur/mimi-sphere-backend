import { Types } from 'mongoose';
import { TFaq } from '../brand/brand.interface';

export interface TCollection {
    _id?: Types.ObjectId | string;
    name: string;
    slug: string;
    isActive?: boolean;
    displayOrder?: number;
    // Content
    heroTitle?: string;
    heroDescription?: string;
    bannerImage?: string;
    content?: string; // Rich Text
    // SEO
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    // Product Selection
    productSelectionMode: 'manual' | 'automatic';
    manualProducts?: Types.ObjectId[] | string[] | any[];
    automaticFilters?: {
        brands?: string[];
        categories?: Types.ObjectId[] | string[] | any[];
        tags?: string[];
    };
    // FAQs
    FAQs?: TFaq[];
    createdAt?: Date;
    updatedAt?: Date;
}
