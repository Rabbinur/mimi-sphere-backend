/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError, ZodIssue } from "zod";
import mongoose from "mongoose";
import ApiError, { IGenericErrorMessage } from "./error";

class ErrorHandler {
  private statusCode: number = 500;
  private message: string = "Something went wrong";
  private errorMessages: IGenericErrorMessage[] = [];

  constructor() {}

  public handleZodValidationError(error: ZodError) {
    const errors: IGenericErrorMessage[] = error.issues.map(
      (issue: ZodIssue) => {
        return {
          path: issue?.path[issue.path.length - 1],
          message: issue?.message
        };
      }
    );

    this.statusCode = 400;
    this.message = "Validation Error";
    this.errorMessages = errors;
  }

  public handleApiError(error: ApiError) {
    this.statusCode = error?.statusCode || 500;
    this.message = error.message || "Something went wrong";
    this.errorMessages = error?.message
      ? [
          {
            path: "",
            message: error.message
          }
        ]
      : [];
  }

  public handleGenericError(error: Error) {
    this.message = error?.message || "Something went wrong";
    this.errorMessages = error?.message
      ? [
          {
            path: "",
            message: error.message
          }
        ]
      : [];
  }

  public handleCastError(error: mongoose.Error.CastError) {
    const errors: IGenericErrorMessage[] = [
      {
        path: error.path,
        message: "Invalid id!"
      }
    ];

    this.errorMessages = errors;
    this.statusCode = 400;
    this.message = `Invalid MongoDB ObjectId`;
  }

  public handleValidationError(error: mongoose.Error.ValidationError) {
    const errors: IGenericErrorMessage[] = Object.values(error.errors).map(
      (el: mongoose.Error.ValidatorError | mongoose.Error.CastError) => {
        return {
          path: el?.path,
          message: el?.message
        };
      }
    );
    this.statusCode = 400;
    this.errorMessages = errors;
    this.message = "Validation Error!";
  }

  public globalErrorHandler: ErrorRequestHandler = (
    error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (error instanceof ZodError) {
      this.handleZodValidationError(error);
    } else if (error instanceof ApiError) {
      this.handleApiError(error);
    } else if (error?.code === 11000) {
      this.statusCode = 400;
      const key = error.keyValue ? Object.keys(error.keyValue)[0] : "field";
      const value = error.keyValue ? error.keyValue[key] : "";
      this.message = `Duplicate value: "${value}" for unique property "${key}". Please use a different value.`;
      this.errorMessages = [
        {
          path: key,
          message: this.message
        }
      ];
    } else if (error instanceof mongoose.Error.CastError) {
      this.handleCastError(error);
    } else if (error instanceof mongoose.Error.ValidationError) {
      this.handleValidationError(error);
    } else if (error instanceof Error) {
      this.handleGenericError(error);
    }
    res.status(this.statusCode).json({
      statusCode: this.statusCode,
      success: false,
      message: this.message,
      errorMessages: this.errorMessages,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined
    });
  };
}

export default new ErrorHandler();
