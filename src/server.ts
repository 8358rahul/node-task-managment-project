import "dotenv/config";
import http from "http";
import app from "./app";
import connectDB from "./config/db";
import logger from "./utils/logger";
import { NODE_ENV, PORT } from "./config/env";

const server = http.createServer(app);

async function startServer() {
  await connectDB();

  server.listen(PORT, () => {
    logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  });
}

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  logger.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
