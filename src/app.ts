import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import morgan from 'morgan';
import path from 'path';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './app/routes';
import logger from './app/utils/logger';

dotenv.config();

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const app: Application = express();
app.set('trust proxy', 1);

// ================= MIDDLEWARE =================
app.use(compression());

// parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// HTTP Request Logging
app.use(morgan('dev')); // Console
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
); // File (via Winston rotation)

// 🚀 Slow request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn(
        `🐢 Slow Request [${req.method}] ${req.originalUrl} - ${duration}ms`,
      );
    }
  });
  next();
});

// ================= CORS =================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.shoppingcart.bd',
  'https://shoppingcart.bd',
  'https://admin.shoppingcart.bd',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);
      
      // Allow exact matches in allowedOrigins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow local network and localhost on any port (e.g. 192.168.x.x, 10.x.x.x, localhost)
      if (
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          origin,
        )
      ) {
        return callback(null, true);
      }

      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  }),
);

// ================= HEALTH CHECK =================
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Mimi Sphere server is running!',
  });
});

// ================= STATIC =================
app.use('/uploads', express.static('uploads'));

// ================= ROUTES =================
app.use('/api/v1', router);

// ================= ERROR HANDLER =================
app.use(globalErrorHandler.globalErrorHandler);

// ================= 404 HANDLER =================
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'Route does not exist',
      },
    ],
  });
  next();
});

export default app;
