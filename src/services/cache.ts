import { createClient } from "redis";
import { REDIS_URL } from "../config/env";
import logger from "../utils/logger";

// Create Redis client
const client = createClient({
  url: REDIS_URL,
});

// Error handling
client.on("error", (err) => {
  logger.error(`Redis Client Error: ${err}`);
});

// Connect to Redis
const connectRedis = async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
      logger.info("Redis connected successfully");
    }
  } catch (err) {
    logger.error(`Redis connection error: ${err}`);
    throw err;
  }
};

// Initialize connection immediately
connectRedis();

export const getFromCache = async (key: string): Promise<string | null> => {
  try {
    if (!client.isOpen) {
      await connectRedis();
    }
    return await client.get(key);
  } catch (err) {
    logger.error(`Redis get error: ${err}`);
    throw err;
  }
}; 

export const setCache = async (
  key: string,
  value: string,
  ttl: number = 3600
): Promise<void> => {
  try {
    if (!client.isOpen) {
      await connectRedis();
    }
    await client.setEx(key, ttl, value); // Expires after `ttl` seconds
  } catch (err) {
    logger.error(`Redis set error: ${err}`);
    throw err;
  }
};



export const deleteFromCache = async (pattern: string): Promise<void> => {
  try {
    if (!client.isOpen) await connectRedis();

    const stream = client.scanIterator({ MATCH: pattern });
    for await (const key of stream) {
      await client.del(key);
    }
  } catch (err) {
    logger.error(`Redis delete error: ${err}`);
    throw err;
  }
};



// Graceful shutdown handling
process.on("SIGINT", async () => {
  if (client.isOpen) {
    await client.quit();
    logger.info("Redis connection closed");
  }
  process.exit(0);
});
