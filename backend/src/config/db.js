const mongoose = require("mongoose");
const Redis = require("ioredis");

/* ──────────────────────────── MongoDB ──────────────────────────── */

/**
 * Connect to MongoDB with sensible production defaults.
 * Retries are handled by Mongoose's built-in reconnect logic.
 */
const connectMongo = async () => {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/log_aggregator";

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`[MongoDB] Connected → ${mongoose.connection.host}`);
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err.message);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Runtime error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected — Mongoose will attempt to reconnect");
  });
};

/* ──────────────────────────── Redis Helper ──────────────────────── */

const getRedisOptions = () => {
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(process.env.REDIS_PORT) || 6379;
  const password = process.env.REDIS_PASSWORD || undefined;
  const useTls =
    process.env.REDIS_TLS === "true" || host.includes("upstash.io");

  const options = {
    host,
    port,
    password,
  };

  if (useTls) {
    options.tls = {
      rejectUnauthorized: false,
    };
  }

  return options;
};

/* ──────────────────────────── Redis Client ──────────────────────── */

/**
 * Create and return a Redis client (ioredis).
 * Used for caching, pub/sub, and rate-limiting.
 */
const createRedisClient = () => {
  const baseOpts = getRedisOptions();
  const client = new Redis({
    ...baseOpts,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      console.warn(`[Redis] Retry #${times} in ${delay}ms`);
      return delay;
    },
    lazyConnect: true, // connect explicitly so we can handle errors
  });

  client.on("connect", () => console.log("[Redis]  Connected"));
  client.on("error", (err) => console.error("[Redis]  Error:", err.message));
  client.on("close", () => console.warn("[Redis]  Connection closed"));

  return client;
};

/**
 * Return a plain Redis configuration object.
 * BullMQ creates its own ioredis connections internally,
 * so it needs raw config — not a shared client instance.
 */
const getRedisConfig = () => {
  const baseOpts = getRedisOptions();
  return {
    ...baseOpts,
    maxRetriesPerRequest: null, // required by BullMQ
  };
};

module.exports = { connectMongo, createRedisClient, getRedisConfig };
