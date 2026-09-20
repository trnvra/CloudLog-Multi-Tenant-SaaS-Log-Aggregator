const { Queue } = require("bullmq");
const { getRedisConfig } = require("../config/db");

/* ──────────────────────── Log Ingestion Queue ──────────────────── */

const QUEUE_NAME = "log-ingestion-queue";

/**
 * BullMQ Queue for asynchronous log ingestion.
 *
 * Logs are pushed here by the controller and consumed by the worker,
 * decoupling the HTTP response from the DB write for high throughput.
 */
const logQueue = new Queue(QUEUE_NAME, {
  connection: getRedisConfig(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600,   // keep completed jobs for 1 hour
      count: 5000, // …or at most 5 000
    },
    removeOnFail: {
      age: 86400,  // keep failed jobs for 24 hours for debugging
    },
  },
});

logQueue.on("error", (err) => {
  console.error(`[Queue:${QUEUE_NAME}] Error:`, err.message);
});

module.exports = { logQueue, QUEUE_NAME };
