import { TCustomerReview } from './customerReview.interface';
import { CustomerReview } from './customerReview.model';

const createCustomerReviewIntoDB = async (payload: TCustomerReview) => {
  const result = await CustomerReview.create(payload);
  return result;
};

const INITIAL_SEEDS: TCustomerReview[] = [
  {
    name: 'Samira Hossain',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    rating: 5,
    tag: 'Verified Buyer • Gulshan, Dhaka',
    review:
      'আলহামদুলিল্লাহ! আমার পার্সেলটি আজকে হাতে পেলাম। অনেক অনেক ধন্যবাদ Mimi Sphere কে। কাপড়ের কোয়ালিটি মাশাআল্লাহ যেমন চেয়েছিলাম ঠিক তেমনই পেয়েছি। কালার এবং ফিটিং একদম পারফেক্ট!',
    is_verified: true,
    is_featured: true,
    status: 'active',
    order: 1,
  },
  {
    name: 'Mahasin Aysha',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    rating: 5,
    tag: 'Verified Buyer • Chattogram',
    review:
      'Honestly bolte, ami jekhon order kori I was a bit skeptical, but when the package arrived, I was totally amazed! The Korean skincare items were 100% authentic and packaging was super cute. Will order again!',
    is_verified: true,
    is_featured: true,
    status: 'active',
    order: 2,
  },
  {
    name: 'Israt Jahan',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    rating: 5,
    tag: 'Verified Buyer • Dhanmondi, Dhaka',
    review:
      'ডিজাইন অনেক সুন্দর ছিল আর কাপড়ের মানও খুব ভালো। দেখতে স্টাইলিশ আর পরতেও আরামদায়ক। বিশেষ করে ডেলিভারি সার্ভিস অনেক ফাস্ট ছিল, ২ দিনের মধ্যেই পেয়ে গেছি।',
    is_verified: true,
    is_featured: true,
    status: 'active',
    order: 3,
  },
  {
    name: 'Israt Amin',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    rating: 5,
    tag: 'Verified Buyer • Sylhet',
    review:
      'আমি কারচুপি ডিজাইনের কালেকশনটি নিয়েছিলাম, কাপড়ের সফটনেস দেখে আমি মুগ্ধ! প্রিমিয়াম লুক দেয় এবং কাটিং ফিনিশিং অসাধারণ। Mimi Sphere এর কালেকশন সত্যিই প্রশংসনীয়।',
    is_verified: true,
    is_featured: true,
    status: 'active',
    order: 4,
  },
];

const getAllCustomerReviewsFromDB = async (query: Record<string, unknown>) => {
  const count = await CustomerReview.countDocuments();
  if (count === 0) {
    try {
      await CustomerReview.insertMany(INITIAL_SEEDS);
    } catch (err) {
      console.error('Seed customer reviews error:', err);
    }
  }

  const { searchTerm, status, is_featured, limit = 50, sort } = query;

  const filter: any = {};

  if (searchTerm) {
    filter.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { review: { $regex: searchTerm, $options: 'i' } },
      { tag: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  if (is_featured !== undefined) {
    filter.is_featured = is_featured === 'true' || is_featured === true;
  }

  let sortQuery: any = { order: 1, createdAt: -1 };
  if (sort === 'rating_desc') sortQuery = { rating: -1, createdAt: -1 };
  if (sort === 'rating_asc') sortQuery = { rating: 1, createdAt: -1 };
  if (sort === 'latest') sortQuery = { createdAt: -1 };

  const result = await CustomerReview.find(filter)
    .sort(sortQuery)
    .limit(Number(limit));

  return result;
};

const getSingleCustomerReviewFromDB = async (id: string) => {
  const result = await CustomerReview.findById(id);
  return result;
};

const updateCustomerReviewInDB = async (
  id: string,
  payload: Partial<TCustomerReview>
) => {
  const result = await CustomerReview.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteCustomerReviewFromDB = async (id: string) => {
  const result = await CustomerReview.findByIdAndDelete(id);
  return result;
};

export const CustomerReviewServices = {
  createCustomerReviewIntoDB,
  getAllCustomerReviewsFromDB,
  getSingleCustomerReviewFromDB,
  updateCustomerReviewInDB,
  deleteCustomerReviewFromDB,
};
