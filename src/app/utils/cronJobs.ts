import cron from 'node-cron';
import { runDatabaseBackup } from './dbBackup';
import logger from './logger';
import { Product } from '../modules/products/product.model';
import { syncAllProductsToGoogleMerchant } from '../modules/products/google-merchant.service';
import { OrderServices } from '../modules/orders/order.services';

export const initCronJobs = () => {
  // Check if we are in a clustered environment (like PM2)
  // Only run cron jobs on the first instance (instance 0) to avoid duplicates
  const isPrimaryInstance =
    !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

  if (isPrimaryInstance) {
    // 🕒 Run Database Backup at 3:00 AM BD Time every day
    cron.schedule(
      '0 3 * * *',
      async () => {
        logger.info('⏰ Running Scheduled Database Backup (3 AM BD Time)...');
        try {
          await runDatabaseBackup();
        } catch (error: any) {
          logger.error('Error during database backup:', error.message);
        }
      },
      {
        timezone: 'Asia/Dhaka',
      },
    );

    // 🕒 Run Google Merchant Sync at 3:30 AM BD Time every day
    cron.schedule(
      '30 3 * * *',
      async () => {
        logger.info('⏰ Running Scheduled Google Merchant Product Sync (3:30 AM BD Time)...');
        try {
          const products = await Product.find({ product_status: 'active' }).lean();
          logger.info(`Fetched ${products.length} active products for Google Merchant Sync.`);
          const results = await syncAllProductsToGoogleMerchant(products);
          logger.info(`Google Merchant Sync completed. Synced ${results.length} products.`);
        } catch (error: any) {
          logger.error('Error during scheduled Google Merchant Sync:', error.message);
        }
      },
      {
        timezone: 'Asia/Dhaka',
      },
    );

    // 🕒 Run Courier Status Sync every 30 minutes
    cron.schedule(
      '*/30 * * * *',
      async () => {
        logger.info('⏰ Running Scheduled Courier Status Sync...');
        try {
          await OrderServices.syncCourierOrderStatus();
        } catch (error: any) {
          logger.error('Error during scheduled courier sync:', error.message);
        }
      },
      {
        timezone: 'Asia/Dhaka',
      },
    );

    logger.info('🚀 Cron Jobs initialized on primary instance.');
  } else {
    logger.info(
      `⏭️ Cron Jobs skipped on instance ${process.env.NODE_APP_INSTANCE}`,
    );
  }
};
