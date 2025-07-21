import mongoose from "mongoose";
import { MONGO_URI, NODE_ENV } from "./env";
import logger from "../utils/logger";

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI, {
      autoIndex: NODE_ENV === "development", // Only create indexes in dev
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
    });
    logger.info("MongoDB Connected...");
  } catch (err) {
    logger.error(`MongoDB Connection Error: ${err}`);
    process.exit(1);
  }
};

// Connection events
mongoose.connection.on("connected", () => {
  logger.info("Mongoose connected to DB");
});

mongoose.connection.on("error", (err) => {
  logger.error(`Mongoose connection error: ${err}`);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("Mongoose disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  logger.info("Mongoose connection closed due to app termination");
  process.exit(0);
});

export default connectDB;
