import { Request, Response, NextFunction } from "express";
import Task from "../models/Task";
import User from "../models/User"; 
import httpStatus from "http-status-codes"; 

// POST /api/admin/assign-task
export const assignTaskToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, title, description, priority, dueDate } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found" });
    }

    const task = await Task.create({
      user: userId,
      title,
      description,
      priority,
      dueDate,
    }); 

    res.status(httpStatus.CREATED).json({ task });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await User.find().select("-password");
    res.status(httpStatus.OK).json({ users });
  } catch (error) {
    next(error);
  }
};
