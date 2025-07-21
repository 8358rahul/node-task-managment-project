import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status-codes";
import jwt from "jsonwebtoken";
import User from "../models/User";
import ApiError from "../utils/ApiError";
import { JWT_SECRET, JWT_EXPIRE } from "../config/env";
import mongoose, { AnyExpression } from "mongoose";
import { AuthenticatedRequest } from "../types/express";
import { loginSchema, registerSchema } from "../validations/authValidation";
import {z} from "zod";

// Register user
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password, role } = validatedData;

    // Check if user exists
    if (await User.findOne({ email })) {
      throw new ApiError(httpStatus.CONFLICT, "Email already exists");
    }

    // Create user
    const user = await User.create({ name, email, password, role });

    // Generate token
    const token = generateToken(user._id);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: "User registered successfully",
      token,
      expiresIn: JWT_EXPIRE,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      let parsedError = JSON.parse(err.message);
      const message = parsedError?.map((e: any) => e.message).join(", ");
      next(new ApiError(httpStatus.BAD_REQUEST, message));
    } else {
      next(err);
    }
  }
};

// Login user
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    // Check for user
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(httpStatus.OK).json({
      success: true,
      message: "Login successful",
      token,
      expiresIn: JWT_EXPIRE,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      let parsedError = JSON.parse(err.message);
      const message = parsedError?.map((e: any) => e.message).join(", ");
      next(new ApiError(httpStatus.BAD_REQUEST, message));
    } else {
      next(err);
    }
  }
};

// Get current user
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    res.status(httpStatus.OK).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Generate JWT token
const generateToken = (id: mongoose.Types.ObjectId): string => {
  return jwt?.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  } as jwt.SignOptions);
};
