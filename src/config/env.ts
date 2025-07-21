import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// Validate required environment variables
const requiredEnvVars = [
  "NODE_ENV",
  "PORT",
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_EXPIRE",
  "REDIS_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} is required`);
  }
}

// Export typed environment variables
export const NODE_ENV = process.env.NODE_ENV as "development" | "production";
export const PORT = parseInt(process.env.PORT || "3000");
export const MONGO_URI = process.env.MONGO_URI as string;
export const REDIS_URL = process.env.REDIS_URL as string;
export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_EXPIRE = process.env.JWT_EXPIRE as string;
