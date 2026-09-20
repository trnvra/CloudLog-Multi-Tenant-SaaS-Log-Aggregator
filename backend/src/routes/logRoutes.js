const { Router } = require("express");
const { ingestLog, ingestBatch, getLogs } = require("../controllers/logController");
const apiKeyAuth = require("../middleware/apiKeyAuth");
const logIngestRateLimiter = require("../middleware/rateLimiter");

const router = Router();

/**
 * Apply rate limiting to all /api/v1/logs routes (max 100 req/sec)
 */
router.use(logIngestRateLimiter);

/**
 * POST /api/v1/logs        → Ingest a single log entry (Requires x-api-key)
 * POST /api/v1/logs/batch  → Ingest up to 500 log entries (Requires x-api-key)
 * GET  /api/v1/logs        → Fetch persisted logs from MongoDB (Filtered by x-api-key tenant)
 */
router.post("/", apiKeyAuth, ingestLog);
router.post("/batch", apiKeyAuth, ingestBatch);
router.get("/", apiKeyAuth, getLogs);

module.exports = router;
