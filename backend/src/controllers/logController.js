const { logQueue } = require("../queues/logQueue");
const Log = require("../models/Log");
const User = require("../models/User");
const { LOG_LEVELS } = require("../models/Log");
const { logRequestsCounter } = require("../config/metrics");

/* ──────────────── POST /api/v1/logs ───────────────────── */

/**
 * Receive a single log entry, validate it, check tier usage limit,
 * push it onto the BullMQ queue, and return 201 immediately.
 *
 * Body: { tenantId?, serviceName, level, message, metadata? }
 */
const ingestLog = async (req, res, next) => {
  try {
    const { tenantId, serviceName, level, message, metadata } = req.body;
    const activeTenant =
      req.tenantId || tenantId || req.headers["x-tenant-id"] || "default-tenant";

    /* ── Tier Usage Quota Check ── */
    let tenantUser = req.user;
    if (!tenantUser && activeTenant !== "default-tenant") {
      tenantUser = await User.findOne({ tenantId: activeTenant });
    }
    if (!tenantUser && req.headers["x-api-key"]) {
      tenantUser = await User.findOne({ apiKey: req.headers["x-api-key"] });
    }

    if (tenantUser) {
      const currentUsage = tenantUser.currentMonthUsage || 0;
      const maxLimit = tenantUser.monthlyLogLimit || 10000;

      if (currentUsage >= maxLimit) {
        logRequestsCounter.inc({
          service: serviceName || "unknown",
          level: level || "UNKNOWN",
          status: 429,
        });
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Monthly log limit exceeded (${currentUsage.toLocaleString()} / ${maxLimit.toLocaleString()} logs used). Please upgrade your subscription plan.`,
          usage: {
            currentMonthUsage: currentUsage,
            monthlyLogLimit: maxLimit,
          },
        });
      }
    }

    /* ── Validation ── */
    const errors = [];

    if (!serviceName || typeof serviceName !== "string") {
      errors.push("serviceName is required and must be a string");
    }

    if (!message || typeof message !== "string") {
      errors.push("message is required and must be a string");
    }

    if (level && !LOG_LEVELS.includes(level)) {
      errors.push(`level must be one of: ${LOG_LEVELS.join(", ")}`);
    }

    if (errors.length > 0) {
      logRequestsCounter.inc({
        service: serviceName || "unknown",
        level: level || "UNKNOWN",
        status: 400,
      });
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    /* ── Enqueue ── */
    const jobData = {
      tenantId: String(activeTenant).trim(),
      serviceName: serviceName.trim(),
      level: level || "INFO",
      message,
      metadata: metadata || {},
      timestamp: new Date(),
    };

    const job = await logQueue.add("ingest", jobData, {
      priority: level === "FATAL" ? 1 : level === "ERROR" ? 2 : level === "WARN" ? 3 : 4,
    });

    logRequestsCounter.inc({
      service: serviceName.trim(),
      level: level || "INFO",
      status: 201,
    });

    /* ── Increment Usage Counter ── */
    if (tenantUser) {
      await User.updateOne({ _id: tenantUser._id }, { $inc: { currentMonthUsage: 1 } }).catch(() => {});
    }

    return res.status(201).json({
      accepted: true,
      jobId: job.id,
      message: "Log queued for processing",
    });
  } catch (err) {
    logRequestsCounter.inc({
      service: req.body?.serviceName || "unknown",
      level: req.body?.level || "UNKNOWN",
      status: 500,
    });
    next(err);
  }
};

/* ──────────────── POST /api/v1/logs/batch ─────────────────────── */

/**
 * Receive an array of log entries and enqueue them in bulk.
 *
 * Body: { tenantId?, logs: [{ serviceName, level, message, metadata? }, ...] }
 */
const ingestBatch = async (req, res, next) => {
  try {
    const { tenantId, logs } = req.body;
    const activeTenant =
      req.tenantId || tenantId || req.headers["x-tenant-id"] || "default-tenant";

    if (!Array.isArray(logs) || logs.length === 0) {
      return res
        .status(400)
        .json({ error: "body.logs must be a non-empty array" });
    }

    if (logs.length > 500) {
      return res
        .status(400)
        .json({ error: "Batch size must not exceed 500 entries" });
    }

    /* ── Tier Usage Quota Check ── */
    let tenantUser = req.user;
    if (!tenantUser && activeTenant !== "default-tenant") {
      tenantUser = await User.findOne({ tenantId: activeTenant });
    }
    if (!tenantUser && req.headers["x-api-key"]) {
      tenantUser = await User.findOne({ apiKey: req.headers["x-api-key"] });
    }

    const batchCount = logs.length;

    if (tenantUser) {
      const currentUsage = tenantUser.currentMonthUsage || 0;
      const maxLimit = tenantUser.monthlyLogLimit || 10000;

      if (currentUsage + batchCount > maxLimit || currentUsage >= maxLimit) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Ingesting batch of ${batchCount} logs would exceed monthly quota (${currentUsage.toLocaleString()} / ${maxLimit.toLocaleString()} logs used).`,
          usage: {
            currentMonthUsage: currentUsage,
            monthlyLogLimit: maxLimit,
          },
        });
      }
    }

    const jobs = logs.map((entry) => ({
      name: "ingest",
      data: {
        tenantId: (entry.tenantId || activeTenant || "default-tenant").trim(),
        serviceName: (entry.serviceName || "").trim(),
        level: LOG_LEVELS.includes(entry.level) ? entry.level : "INFO",
        message: entry.message || "",
        metadata: entry.metadata || {},
        timestamp: new Date(),
      },
      opts: {
        priority:
          entry.level === "FATAL"
            ? 1
            : entry.level === "ERROR"
            ? 2
            : entry.level === "WARN"
            ? 3
            : 4,
      },
    }));

    const added = await logQueue.addBulk(jobs);

    for (const entry of logs) {
      logRequestsCounter.inc({
        service: (entry.serviceName || "unknown").trim(),
        level: LOG_LEVELS.includes(entry.level) ? entry.level : "INFO",
        status: 201,
      });
    }

    /* ── Increment Usage Counter ── */
    if (tenantUser) {
      await User.updateOne({ _id: tenantUser._id }, { $inc: { currentMonthUsage: batchCount } }).catch(() => {});
    }

    return res.status(201).json({
      accepted: true,
      count: added.length,
      message: `${added.length} logs queued for processing`,
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────── GET /api/v1/logs & /api/logs ───────────────── */

/**
 * Fetch persisted logs from MongoDB with advanced date range, search, filters & pagination.
 *
 * Query params: ?startDate=...&endDate=...&search=...&serviceName=...&level=...&page=1&limit=100
 */
const getLogs = async (req, res, next) => {
  try {
    const {
      tenantId,
      serviceName,
      service,
      level,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 100,
    } = req.query;

    const filter = {};
    const activeTenant = req.tenantId || tenantId;
    if (activeTenant) filter.tenantId = activeTenant;

    const targetService = serviceName || service;
    if (targetService && targetService !== "ALL" && targetService !== "*") {
      filter.serviceName = targetService;
    }

    if (level && level !== "ALL") {
      filter.level = level.toUpperCase();
    }

    /* ── Date Range Filter ── */
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart.getTime())) {
          filter.timestamp.$gte = parsedStart;
        }
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd.getTime())) {
          filter.timestamp.$lte = parsedEnd;
        }
      }
    }

    /* ── Search Keyword Filter ── */
    if (search && search.trim() !== "") {
      const queryStr = search.trim();
      filter.$or = [
        { message: { $regex: queryStr, $options: "i" } },
        { serviceName: { $regex: queryStr, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(500, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Log.countDocuments(filter),
    ]);

    return res.json({
      count: logs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
      logs,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { ingestLog, ingestBatch, getLogs };
