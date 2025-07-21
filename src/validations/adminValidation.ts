import { z } from "zod";

export const assignTaskSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.string().optional(),
  }),
});
