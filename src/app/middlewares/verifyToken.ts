import { NextFunction, Request, Response } from 'express';
import { JwtPayload, Secret } from 'jsonwebtoken';
import JwtHelpers from '../helpers/jwtHelpers';
import ApiError from './error';
import { IRoles } from '../modules/users/user.constant';
import { HttpStatusCode } from '../../lib/httpStatus';
import config from '../config';

const verifyToken =
  (allowedRoles?: IRoles[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    // 1. Get token from cookies or authorization header
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization) {
      const raw_token = req.headers.authorization;
      if (raw_token.startsWith('Bearer ')) {
        token = raw_token.split(' ')[1];
      } else {
        token = raw_token;
      }
    }

    if (!token) {
      throw new ApiError(
        HttpStatusCode.UNAUTHORIZED,
        'Authentication failed. Please login to access this resource.',
      );
    }

    // 2. Verify token
    const isVerified: JwtPayload | null = JwtHelpers.verifyToken(
      token,
      config.jwt_access_secret as Secret,
    );

    if (!isVerified) {
      throw new ApiError(
        HttpStatusCode.UNAUTHORIZED,
        'Invalid or expired access token. Please login again.',
      );
    }

    // 3. Role-based access control
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(isVerified.role as IRoles)) {
        throw new ApiError(HttpStatusCode.FORBIDDEN, 'Forbidden: Access denied');
      }
    }

    // 4. Attach user info to request
    req.user = isVerified;

    next();
  };

export default verifyToken;
