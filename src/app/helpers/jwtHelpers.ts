import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ApiError from "../middlewares/error";
import { HttpStatusCode } from "../../lib/httpStatus";

class JwtHelpers {
  static createToken(
    payload: Record<string, unknown>,
    secret: Secret,
    expireTime: any
  ): string {
    return jwt.sign(payload, secret, {
      expiresIn: expireTime
    });
  }

  static verifyToken(token: string, secret: Secret): JwtPayload {
    try {
      return jwt.verify(token, secret) as JwtPayload;
    } catch (error: any) {
      if (error?.name === "TokenExpiredError") {
        throw new ApiError(
          HttpStatusCode.UNAUTHORIZED,
          "Your session has expired. Please log in again to continue."
        );
      } else if (error?.name === "JsonWebTokenError") {
        throw new ApiError(
          HttpStatusCode.UNAUTHORIZED,
          "Invalid token. Authentication failed."
        );
      } else if (error?.name === "NotBeforeError") {
        throw new ApiError(
          HttpStatusCode.UNAUTHORIZED,
          "Token is not active yet. Please wait before retrying."
        );
      } else {
        // Unexpected error — possibly a library bug or misconfiguration
        throw new ApiError(
          HttpStatusCode.INTERNAL_SERVER_ERROR,
          "An unexpected error occurred while verifying authentication."
        );
      }
    }
  }
}

export default JwtHelpers;
