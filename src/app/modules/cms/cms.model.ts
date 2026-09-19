import mongoose, { Schema } from 'mongoose';
import { CMS } from './cms.types';

const CMSchema = new Schema<CMS>(
  {
    company: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
    },

    social: {
      links: [
        {
          platform: { type: String, default: '' },
          url: { type: String, default: '' },
          icon: { type: String, default: '' },
        },
      ],
    },
    heroSliderDesktop: [
      {
        image: { type: String, required: true },
        link: { type: String, default: '' },
        alt: { type: String, default: '' },
      },
    ],
    heroSliderMobile: [
      {
        image: { type: String, required: true },
        link: { type: String, default: '' },
        alt: { type: String, default: '' },
      },
    ],
    heroFeatures: [
      {
        title: { type: String, required: true },
        subtitle: { type: String, required: true },
        image: { type: String, required: true },
        link: { type: String, default: '' },
      },
    ],
    bentoGrid: {
      isEnabled: { type: Boolean, default: true },
      tag: { type: String, default: 'Featured Highlights' },
      title: { type: String, default: 'Trending Collections' },
      items: [
        {
          badge: { type: String, default: '' },
          title: { type: String, default: '' },
          subtitle: { type: String, default: '' },
          image: { type: String, default: '' },
          link: { type: String, default: '' },
        },
      ],
    },
  },
  { timestamps: true },
);

export default mongoose.model<CMS>('CMS', CMSchema);
