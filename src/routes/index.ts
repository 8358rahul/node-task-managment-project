import { Router } from "express";
import authRoutes from "./auth";
import taskRoutes from "./tasks";
import adminRoutes from "./admin";
import { authorize, protect } from "../middleware/auth";

const router = Router();

// Auth routes
router.use("/auth", authRoutes);

// Task routes (protected)
router.use("/tasks", protect, taskRoutes);

// Admin routes (protected)
router.use("/admin", protect, authorize("admin"), adminRoutes);

export default router;
