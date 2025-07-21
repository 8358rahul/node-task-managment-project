import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError";
import logger from "../utils/logger";
import httpStatus from "http-status-codes";
import mongoose from "mongoose";

export default (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";

  // Handle known error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Handle Mongoose validation errors
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }
  // Handle duplicate key errors
  else if ((err as any).code === 11000) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Duplicate field value entered";
  }
  // Handle JWT errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = httpStatus.UNAUTHORIZED;
    message = "Invalid token";
  }
  // Handle TokenExpiredError
  else if (err.name === "TokenExpiredError") {
    statusCode = httpStatus.UNAUTHORIZED;
    message = "Token expired";
  }

  // Log the error (more detailed in development)
  if (process.env.NODE_ENV === "development") {
    logger.error({
      message: err.message,
      stack: err.stack,
      originalError: err,
    });
  } else {
    logger.error(err.message);
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      status: statusCode,
      message: message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};
