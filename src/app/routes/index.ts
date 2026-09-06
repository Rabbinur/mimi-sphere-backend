import { Router } from 'express';

import { ProductRoutes } from '../modules/products/product.routes';
import { OrderRoutes } from '../modules/orders/order.routes';
import { CategoryRoutes } from '../modules/category/category.route';
import { ekpayRoutes } from '../modules/ekpay/ekpay.route';
import { CouponRoutes } from '../modules/coupon/coupon.route';
import { FileRoutes } from '../modules/file/file.routes';

import { CMSRoutes } from '../modules/cms/cms.routes';
import { CustomOrderRoutes } from '../modules/customOrder/customOrder.route';
import { BlogRoutes } from '../modules/blog/blog.routes';
import { BlogCategoryRoutes } from '../modules/blog-category/blogCategory.routes';
import { NewsletterRoutes } from '../modules/newsletter/newsletter.routes';
import { BkashRoutes } from '../modules/bkash/bkash.route';
import { ContactRoutes } from '../modules/contact/contact.route';
import { MetaEventsRoutes } from '../modules/meta-events/meta-events.route';
import { GoogleAnalyticsRoutes } from '../modules/google-analytics/google-analytics.route';
import { UserRoutes } from '../modules/users/user.route';
import { OTPRoutes } from '../modules/otp/otp.route';
import { AddressRoutes } from '../modules/address/address.route';
import { ServerLogRoutes } from '../modules/server-logs/server-logs.route';

import { BrandRoutes } from '../modules/brand/brand.route';
import { CartRoutes } from '../modules/cart/cart.routes';
import { ReviewRoutes } from '../modules/review/review.route';
import { CheckoutLeadRoutes } from '../modules/checkout-lead/checkout-lead.routes';
import { CampaignRoutes } from '../modules/campaign/campaign.routes';
import { CollectionRoutes } from '../modules/collection/collection.route';
import { PosRoutes } from '../modules/pos/pos.routes';


const router = Router();

const moduleRoutes = [
  {
    path: '/admin/pos',
    route: PosRoutes,
  },
  {
    path: '/campaigns',
    route: CampaignRoutes,
  },
  {
    path: '/collections',
    route: CollectionRoutes,
  },
  {
    path: '/cart',
    route: CartRoutes,
  },
  {
    path: '/brands',
    route: BrandRoutes,
  },
  {
    path: '/address',
    route: AddressRoutes,
  },
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/products',
    route: ProductRoutes,
  },
  {
    path: '/orders',
    route: OrderRoutes,
  },
  {
    path: '/categories',
    route: CategoryRoutes,
  },
  {
    path: '/ekpay',
    route: ekpayRoutes,
  },
  {
    path: '/bkash',
    route: BkashRoutes,
  },
  {
    path: '/coupons',
    route: CouponRoutes,
  },
  {
    path: '/file',
    route: FileRoutes,
  },

  {
    path: '/cms',
    route: CMSRoutes,
  },
  {
    path: '/custom-orders',
    route: CustomOrderRoutes,
  },
  {
    path: '/blogs',
    route: BlogRoutes,
  },
  {
    path: '/blog-categories',
    route: BlogCategoryRoutes,
  },
  {
    path: '/newsletter',
    route: NewsletterRoutes,
  },
  {
    path: '/contact',
    route: ContactRoutes,
  },
  {
    path: '/meta-events',
    route: MetaEventsRoutes,
  },
  {
    path: '/google-analytics',
    route: GoogleAnalyticsRoutes,
  },
  {
    path: '/otp',
    route: OTPRoutes,
  },
  {
    path: '/server-logs',
    route: ServerLogRoutes,
  },
  {
    path: '/reviews',
    route: ReviewRoutes,
  },
  {
    path: '/checkout-leads',
    route: CheckoutLeadRoutes,
  },
];


moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
