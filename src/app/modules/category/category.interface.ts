import { Types } from 'mongoose';

export interface TCategory {
    _id?: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    parent_category_id?: Types.ObjectId | null;
    imageUrl?: string;
    bannerImage?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    sub_categories?: TCategory[];
    order?: number;
}
