
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
  title: string;
  subtitle?: string;
  image: string;
  link: string;
}

export interface BentoGridCMS {
  isEnabled: boolean;
  tag?: string;
  title?: string;
  items: BentoItem[];
}

export interface CMS {
  company: Company;
  social: Social;
  heroSliderDesktop: HeroSlide[];
  heroSliderMobile: HeroSlide[];
  heroFeatures: HeroFeature[];
  bentoGrid?: BentoGridCMS;
}
