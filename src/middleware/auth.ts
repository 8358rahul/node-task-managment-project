import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import ApiError from "../utils/ApiError";
import logger from "../utils/logger";
import { JWT_SECRET } from "../config/env";
import httpStatus from "http-status-codes";
import { AuthenticatedRequest } from "../types/express";

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new ApiError(
        httpStatus.UNAUTHORIZED,
        "Not authorized to access this route"
      )
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    // Get user from the token
    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (err) {
    logger.error(`Authentication error: ${err}`);
    next(new ApiError(httpStatus.UNAUTHORIZED, "Not authorized"));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          httpStatus.FORBIDDEN,
          `User role ${req.user.role} is not authorized to access this route`
        )
      );
    }
    next();
  };
};
