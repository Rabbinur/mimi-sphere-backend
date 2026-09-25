import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Standard response format for rate limit violations
 */
const rateLimitHandler = (message: string) => {
  return (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      message,
      errorMessages: [
        {
          path: req.originalUrl,
          message,
        },
      ],
    });
  };
};

/**
 * 1. Global Rate Limiter
 * Protects entire application against scraping, flood attacks, and general abuse.
 * 1000 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // Express-rate-limit v7 uses 'limit' (and supports 'max')
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many requests from this IP, please try again after 15 minutes.',
  ),
  skip: (req) => {
    // Skip health check and static assets
    return req.path === '/' || req.path.startsWith('/uploads');
  },
});

/**
 * 2. Auth Limiter
 * Protects login, registration, and password recovery endpoints against brute force attacks.
 * 20 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many authentication attempts. Please try again after 15 minutes.',
  ),
});

/**
 * 3. OTP Limiter
 * Prevents SMS/Email bombing, verification brute forcing, and unnecessary provider costs.
 * 5 attempts per 10 minutes per IP.
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many OTP requests from this IP. Please wait 10 minutes before requesting again.',
  ),
});

/**
 * 4. Order Creation Limiter
 * Prevents malicious bots and abuse scripts from creating hundreds of spam orders.
 * 30 attempts per 10 minutes per IP.
 */
export const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many order attempts from this IP. Please wait a few minutes before trying again.',
  ),
});
