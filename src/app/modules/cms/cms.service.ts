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
};

class CMSService {
  /**
   * Get CMS (Singleton)
   */
  async getCMS() {
    let cms = await CMSModel.findOne();

    if (!cms) {
      cms = await CMSModel.create(DEFAULT_CMS_DATA);
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
