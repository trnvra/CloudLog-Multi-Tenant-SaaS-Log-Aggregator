const client = require("prom-client");

// Initialize Prometheus registry
const register = new client.Registry();

// Enable default metrics (CPU, Memory, Event Loop lag, Garbage Collection, etc.)
client.collectDefaultMetrics({
  register,
  prefix: "log_aggregator_",
});

/* ──────────────────────── Custom Metrics ──────────────────────── */

/**
 * 1) Total log requests counter
 * Labels: service, level, status
 */
const logRequestsCounter = new client.Counter({
  name: "log_requests_total",
  help: "Total number of log ingestion HTTP requests received",
  labelNames: ["service", "level", "status"],
  registers: [register],
});

/**
 * 2) BullMQ queue lag / waiting jobs gauge
 * Gauge reflecting current number of jobs waiting in the BullMQ queue
 */
const queueLagGauge = new client.Gauge({
  name: "bullmq_queue_waiting_jobs",
  help: "Number of jobs currently waiting in the BullMQ log ingestion queue",
  labelNames: ["queue"],
  registers: [register],
});

/**
 * 3) Worker processing latency histogram
 * Histogram tracking batch flush processing duration in seconds
 */
const workerProcessingHistogram = new client.Histogram({
  name: "log_worker_processing_duration_seconds",
  help: "Histogram of batch log processing latency in seconds",
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

module.exports = {
  register,
  logRequestsCounter,
  queueLagGauge,
  workerProcessingHistogram,
};
