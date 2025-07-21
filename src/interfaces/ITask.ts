import mongoose from "mongoose";

export interface ITask {
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: Date;
  createdBy: mongoose.Types.ObjectId;
}
