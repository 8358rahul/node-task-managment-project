import { Response, NextFunction } from "express";
import httpStatus from "http-status-codes";
import Task from "../models/Task";
import ApiError from "../utils/ApiError";
import { deleteFromCache, getFromCache, setCache } from "../services/cache";
import { AuthenticatedRequest } from "../types/express";
import mongoose from "mongoose";
import { createTaskSchema, updateTaskSchema } from "../validations/taskValidation";


const TASK_CACHE_TTL = 3600;

// Helper function for task ownership check
const verifyTaskOwnership = async (taskId: string, userId: string) => {
  const task = await Task.findOne({ _id: taskId, createdBy: userId });
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, "Task not found");
  }
  return task;
};

// Get all tasks with caching, filtering, sorting, and pagination
export const getTasks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const cacheKey = `tasks:${req.user.id}:${JSON.stringify(req.query)}`;
    const cachedData = await getFromCache(cacheKey);
    console.log("Cache Key:", cachedData);
    if (cachedData) {
      return res.status(httpStatus.OK).json({
        success: true,
        fromCache: true,
        count: JSON.parse(cachedData).length,
        data: JSON.parse(cachedData),
      });
    }

    // Build query
    const queryObj: any = { ...req.query, createdBy: req.user.id };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); 


    let query = Task.find(JSON.parse(queryStr));

    // Sorting
    const sortBy = req.query.sort
      ? (req.query.sort as string).split(",").join(" ")
      : "-createdAt";
    query = query.sort(sortBy);

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const tasks = await query.skip(skip).limit(limit).lean();

    // Cache results
    await setCache(cacheKey, JSON.stringify(tasks), TASK_CACHE_TTL);

    res.status(httpStatus.OK).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

// Get single task
export const getTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try { 
    const task = await verifyTaskOwnership(req.params.id, req.user.id);
    res.status(httpStatus.OK).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

// Create new task
export const createTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = createTaskSchema.parse(req.body);

    const task = await Task.create({
      ...validatedData,
      createdBy: req.user.id,
    });

    // Invalidate cache
    await deleteFromCache(`tasks:${req.user.id}:*`);

    res.status(httpStatus.CREATED).json({
      success: true,
      data: task,
    });
  } catch (err) {
     if (err instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(err.errors).map((val) => val.message);
      next(new ApiError(httpStatus.BAD_REQUEST, messages.join(", ")));
    } else {
      next(err);
    }
  }
};


// Update task
export const updateTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = updateTaskSchema.parse(req.body);
    await verifyTaskOwnership(req.params.id, req.user.id);

    const task = await Task.findByIdAndUpdate(req.params.id, validatedData, {
      new: true,
      runValidators: true,
      context: "query",
    });

    // Invalidate cache
    await deleteFromCache(`tasks:${req.user.id}:*`);

    res.status(httpStatus.OK).json({
      success: true,
      data: task,
    });
  } catch (err) {
     if (err instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(err.errors).map((val) => val.message);
      next(new ApiError(httpStatus.BAD_REQUEST, messages.join(", ")));
    } else {
      next(err);
    }
  }
};


// Delete task
export const deleteTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const task = await verifyTaskOwnership(req.params.id, req.user.id);
    await task.deleteOne();

    // Invalidate cache
    await deleteFromCache(`tasks:${req.user.id}:*`);

    res.status(httpStatus.OK).json({
      success: true,
      data: null,
      message: "Task deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

