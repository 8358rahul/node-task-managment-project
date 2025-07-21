import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import logger from "./utils/logger";
import errorHandler from "./middleware/errorHandler";
import router from "./routes";

const app: Application = express();

// it is for security purposes
app.disable("x-powered-by"); // Hide Express server info

// Security middleware
app.use(helmet()); // set secure http headers
app.use(cors()); // Enable CORS for all routes
app.use(mongoSanitize()); // Prevents NoSQL injection by removing prohibited characters from request data.

// Logging middleware
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);

// Rate limiting
// protect against brute-force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use(limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1", router);

// Error handling (must be last middleware)
app.use(errorHandler);

export default app;
