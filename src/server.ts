import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { initCronJobs } from './app/utils/cronJobs';
import logger from './app/utils/logger';

async function main() {
  try {
    await mongoose.connect(config.database_url as string, {
      maxPoolSize: 50, // Allows up to 50 concurrent database sockets
      minPoolSize: 10, // Keeps 10 warm connections ready
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('📦 Database connected successfully with optimized connection pooling.');

    initCronJobs();

    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server is listening on port ${config.port}`);
    });

    const exitHandler = () => {
      if (server) {
        server.close(() => {
          logger.info('Server closed gracefully');
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    };

    const unexpectedErrorHandler = (error: unknown) => {
      logger.error(`❌ Unexpected error: ${error}`);
      exitHandler();
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);
  } catch (err) {
    logger.error(`❌ Server startup failed: ${err}`);
  }
}

main();
