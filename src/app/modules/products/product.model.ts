import { Schema, model } from 'mongoose';
import { TProduct } from './product.interface';

const ProductSchema = new Schema<TProduct>(
  {
    product_title: {
      type: String,
      required: true,
      trim: true,
    },

    product_description: {
      type: String,
      required: true,
    },

    url_handle: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },

    thumbnail: {
      type: String,
      default: '',
    },

    product_images: {
      type: [String],
      default: [],
    },

    product_price: {
      type: Number,
      required: true,
      min: 0,
    },

    compare_at_price: {
      type: Number,
      default: 0,
    },

    cost_price: {
      type: Number,
      default: 0,
    },

    barcode: {
      type: String,
      default: '',
      trim: true,
    },

    discount_percentage: {
      type: Number,
      default: 0,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      set: (v: string) => (v === "" ? undefined : v),
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    moq: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    country_of_origin: {
      type: String,
      default: '',
    },

    delivery_charge: {
      inside_dhaka: {
        type: Number,
        default: 0,
      },
      outside_dhaka: {
        type: Number,
        default: 0,
      },
    },

    product_categories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],

    product_vendor: {
      type: String,
      default: '',
    },

    brand: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
    },

    seo_title: {
      type: String,
      default: '',
    },
    seo_description: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    shipping_policy: {
      type: String,
      default: '',
    },
    return_policy: {
      type: String,
      default: '',
    },
    continue_selling: {
      type: Boolean,
      default: false,
    },
    charge_tax: {
      type: Boolean,
      default: true,
    },
    physical_details: {
      weight: { type: String, default: '' },
      height: { type: String, default: '' },
      width: { type: String, default: '' },
      length: { type: String, default: '' },
    },

    product_status: {
      type: String,
      enum: ['draft', 'active'],
      default: 'draft',
    },
    average_rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    total_reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    is_trendy: {
      type: Boolean,
      default: false,
    },
    is_limited_time_offer: {
      type: Boolean,
      default: false,
    },
    is_free_delivery: {
      type: Boolean,
      default: false,
    },
    is_pre_order: {
      type: Boolean,
      default: false,
    },
    pre_order_message: {
      type: String,
      default: '',
    },

    product_attributes: [
      {
        _id: false,
        label: String,
        value: String,
      },
    ],

    product_options: [
      {
        option_name: String,
        option_values: [String],
      },
    ],

    product_variants: [
      {
        variant_option_values: {
          type: Map,
          of: String,
        },
        variant_price: {
          type: Number,
          required: true,
        },
        cost_price: {
          type: Number,
          default: 0,
        },
        variant_quantity: {
          type: Number,
          default: 0,
        },
        sku: {
          type: String,
          default: '',
        },
        barcode: {
          type: String,
          default: '',
        },
        compare_at_price: Number,
        image: {
          type: String,
          default: '',
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

/* =====================================================
   PRE-SAVE HOOK: Auto-calculate discount_percentage
===================================================== */
ProductSchema.pre('save', function (next) {
  const price = this.product_price;
  const comparePrice = this.compare_at_price;

  // Handle discount percentage
  if (comparePrice && comparePrice > price) {
    this.discount_percentage = Math.round(
      ((comparePrice - price) / comparePrice) * 100,
    );
  } else {
    this.discount_percentage = 0;
  }

  // Handle free delivery
  if (this.is_free_delivery) {
    this.delivery_charge = {
      inside_dhaka: 0,
      outside_dhaka: 0,
    };
  }

  next();
});

/* =====================================================
   INDEXES (VERY IMPORTANT FOR PERFORMANCE)
===================================================== */

// 🔍 Weighted text search (title prioritized over description)
ProductSchema.index(
  {
    product_title: 'text',
    product_description: 'text',
  },
  {
    weights: {
      product_title: 5,
      product_description: 2,
    },
    name: 'product_text_search',
  },
);

// 📂 Category filtering
ProductSchema.index({ product_categories: 1 });

// 📂 Category + Price compound (shop page filter + sort)
ProductSchema.index({ product_categories: 1, product_price: 1 });

// 🏷 Vendor + Status compound
ProductSchema.index({ product_vendor: 1, product_status: 1 });

// 📅 Sorting / pagination
ProductSchema.index({ createdAt: -1 });

// ⚡ Admin list optimization
ProductSchema.index({
  product_status: 1,
  is_featured: 1,
  is_trendy: 1,
  createdAt: -1,
});

/* ===================================================== */

export const Product = model<TProduct>('Product', ProductSchema);
