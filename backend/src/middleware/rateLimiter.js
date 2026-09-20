const rateLimit = require("express-rate-limit");

/**
 * Rate Limiter Middleware for Log Ingestion
 *
 * Enforces a strict sliding window limit of 100 requests per 1-second interval
 * per IP address / client service.
 */
const logIngestRateLimiter = rateLimit({
  windowMs: 1000, // 1 second window
  max: 100, // Max 100 requests per second
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  validate: {
    keyGeneratorIpFallback: false,
  },
  keyGenerator: (req) => {
    return (
      req.headers["x-service-name"] ||
      (req.body && req.body.serviceName) ||
      req.ip ||
      "127.0.0.1"
    );
  },
  handler: (_req, res) => {
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Maximum 100 requests per second allowed.",
    });
  },
});

module.exports = logIngestRateLimiter;
