import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { initCronJobs } from './app/utils/cronJobs';
import logger from './app/utils/logger';

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    logger.info('📦 Database connected successfully.');

    // Run one-time migration for delivered orders
    const { OrderServices } = await import('./app/modules/orders/order.services');
    await OrderServices.migrateExistingDeliveredOrders();

    initCronJobs();

    app.listen(config.port, () => {
      logger.info(`🚀 Server is listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error(`❌ Server startup failed: ${err}`);
  }
}

main();
