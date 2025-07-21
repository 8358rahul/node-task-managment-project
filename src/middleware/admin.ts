
// middleware/validate.ts
import { NextFunction, Request, Response } from "express";
import { ZodObject,ZodRawShape  } from "zod";
import ApiError from "../utils/ApiError";
import httpStatus from "http-status-codes";

export const validate =
  (schema: ZodObject<ZodRawShape>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      return next(
        new ApiError(httpStatus.BAD_REQUEST, error.errors?.[0]?.message || "Invalid request data")
      );
    }
  };
