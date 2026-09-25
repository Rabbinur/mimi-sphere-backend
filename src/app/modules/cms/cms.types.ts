
export interface Company {
  name: string;
  email: string;
  phone: string;
  address: string;
}



export interface SocialLink {
  platform: string;
  url: string;
  icon?: string;
}

export interface Social {
  links: SocialLink[];
}

export interface HeroSlide {
  image: string;
  link: string;
  alt: string;
}

export interface HeroFeature {
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

export interface BentoItem {
  badge?: string;
  badgeColor?: string;
  title: string;
  subtitle?: string;
  image: string;
  link: string;
  categorySlug?: string;
  colSpan?: number;
  rowSpan?: number;
}

export interface BentoGridCMS {
  isEnabled: boolean;
  tag?: string;
  title?: string;
  items: BentoItem[];
}

export interface FeaturedCollectionsCMS {
  isEnabled: boolean;
  title?: string;
  subtitle?: string;
}

export interface ExitIntentPopupCMS {
  isEnabled: boolean;
  title: string;
  subtitle: string;
  voucherCode: string;
  discountText: string;
  expiryMinutes: number;
  ctaText: string;
  declineText: string;
}

export interface CMS {
  company: Company;
  social: Social;
  heroSliderDesktop: HeroSlide[];
  heroSliderMobile: HeroSlide[];
  heroFeatures: HeroFeature[];
  bentoGrid?: BentoGridCMS;
  featuredCollections?: FeaturedCollectionsCMS;
  exitIntentPopup?: ExitIntentPopupCMS;
}
