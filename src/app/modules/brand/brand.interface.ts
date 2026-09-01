import { Types } from 'mongoose';

export interface TFaq {
    question: string;
    answer: string;
}

export interface TBrand {
    _id?: Types.ObjectId;
    name: string;
    slug: string;
    logoUrl?: string;
    isActive?: boolean;
    order?: number;
    // CMS Fields
    heroTitle?: string;
    heroDescription?: string;
    coverImage?: string;
    content?: string; // Rich Text
    // SEO
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    // FAQs
    FAQs?: TFaq[];
    // Merchandising
    featuredProducts?: Types.ObjectId[] | any[];
    featuredBlogs?: Types.ObjectId[] | any[];
    // Settings
    displayOrder?: number;
    isFeatured?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
