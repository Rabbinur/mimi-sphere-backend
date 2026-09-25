import CMSModel from './cms.model';
import { CMS } from './cms.types';

/**
 * Default CMS data (FIRST TIME SEED)
 */
const DEFAULT_CMS_DATA: CMS = {
  company: {
    name: 'Mimi Sphere',
    email: 'info@shoppingcart.bd',
    phone: '+8801722597565',
    address: 'Dhaka, Bangladesh',
  },

  social: {
    links: [
      { platform: 'facebook', url: '', icon: '/icons/facebook.png' },
      { platform: 'instagram', url: '', icon: '/icons/instagram.png' },
      { platform: 'linkedin', url: '', icon: '/icons/linkedin.png' },
    ],
  },
  heroSliderDesktop: [
    {
      image: "/hero/shopping-cart-bd-banner-1.webp",
      link: "/shop",
      alt: "Hero Slide 1",
    },
    {
      image: "/hero/shopping-cart-bd-banner-2.webp",
      link: "/shop",
      alt: "Hero Slide 2",
    },
  ],
  heroSliderMobile: [
    {
      image: "/hero/slider-s-1.png",
      link: "/shop",
      alt: "Hero Slide 1",
    },
    {
      image: "/hero/slider-s-2.png",
      link: "/shop",
      alt: "Hero Slide 2",
    },
  ],
  heroFeatures: [
    {
      title: "New summer Fashion",
      subtitle: "Handbag",
      image: "/hero/right-1.png",
      link: "/shop",
    },
    {
      title: "Vibrant Avocado Hand Cream",
      subtitle: "Cream",
      image: "/hero/right-2.png",
      link: "/shop",
    },
  ],
  bentoGrid: {
    isEnabled: true,
    tag: "Exclusive Selection",
    title: "Trending Collections",
    items: [
      {
        badge: "Premium Beauty",
        title: "Korean Cosmetics",
        subtitle: "100% Authentic Korean Skincare & Makeup",
        image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600",
        link: "/shop?category=cosmetics",
      },
      {
        badge: "Hot Trend",
        title: "Trendy Bags",
        subtitle: "Everyday Luxury Handbags",
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=400",
        link: "/shop/womens-bags",
      },
      {
        badge: "Handcrafted",
        title: "Kashmiri Churi",
        subtitle: "Traditional Bridal Bangles",
        image: "https://images.unsplash.com/photo-1611591475874-9f7a759600a7?q=80&w=400",
        link: "/shop/premium-bangles",
      },
      {
        badge: "Smart Tech",
        title: "Trending Gadgets",
        subtitle: "High-tech Audio & Wearables",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600",
        link: "/shop/gadgets-accessories",
      },
    ],
  },
};

class CMSService {
  /**
   * Get CMS (Singleton)
   */
  async getCMS() {
    let cms = await CMSModel.findOne();

    if (!cms) {
      cms = await CMSModel.create(DEFAULT_CMS_DATA);
    } else if (!cms.bentoGrid || !cms.bentoGrid.items || cms.bentoGrid.items.length === 0) {
      cms.bentoGrid = DEFAULT_CMS_DATA.bentoGrid;
      await cms.save();
    }

    return cms;
  }

  /**
   * Update CMS
   */
  async updateCMS(payload: Partial<CMS>) {
    const cms = await CMSModel.findOneAndUpdate(
      {},
      { $set: payload },
      {
        new: true,
        upsert: true,
      },
    );

    return cms;
  }
}

export default new CMSService();
