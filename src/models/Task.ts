import mongoose, { Document } from "mongoose";
import { ITask } from "../interfaces/ITask";

export interface ITaskDocument extends ITask, Document {}

const taskSchema = new mongoose.Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "in-progress"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function (this: ITaskDocument, value: Date) {
          return !this.dueDate || value > new Date();
        },
        message: "Due date must be in the future",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
taskSchema.index({ title: "text" });
taskSchema.index({ status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });


const Task = mongoose.model<ITaskDocument>("Task", taskSchema);

export default Task;
