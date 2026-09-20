const AlertRule = require("../models/AlertRule");
const AlertHistory = require("../models/AlertHistory");

/* ──────────────── POST /api/v1/alerts & /api/alerts ─────────── */

/**
 * Create a new alert rule.
 *
 * Body: { name?, service?, serviceName?, level?, keyword?, webhookUrl, isActive?, enabled? }
 */
const createAlert = async (req, res, next) => {
  try {
    const { name, service, serviceName, level, keyword, webhookUrl, isActive, enabled, thresholdCount } = req.body;
    const activeTenant = req.tenantId || "default-tenant";

    const targetService = service || serviceName || "ALL";
    const targetLevel = (level || "ALL").toUpperCase();
    const activeStatus = typeof isActive === "boolean" ? isActive : typeof enabled === "boolean" ? enabled : true;
    const countThreshold = Math.max(1, Number(thresholdCount) || 5);

    const rule = await AlertRule.create({
      tenantId: activeTenant,
      name: name?.trim() || "Alert Rule",
      service: targetService.trim(),
      level: targetLevel.trim(),
      keyword: keyword ? keyword.trim() : "",
      webhookUrl: webhookUrl.trim(),
      isActive: activeStatus,
      thresholdCount: countThreshold,
    });

    return res.status(201).json({
      message: "Alert rule created successfully",
      rule,
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────── GET /api/v1/alerts & /api/alerts ──────────── */

/**
 * List alert rules with optional filters.
 */
const getAlerts = async (req, res, next) => {
  try {
    const { service, level, page = 1, limit = 50 } = req.query;
    const activeTenant = req.tenantId || "default-tenant";

    const filter = { tenantId: activeTenant };
    if (service && service !== "ALL") filter.service = service;
    if (level && level !== "ALL") filter.level = level.toUpperCase();

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [rules, total] = await Promise.all([
      AlertRule.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AlertRule.countDocuments(filter),
    ]);

    return res.json({
      rules: rules.map((r) => ({
        ...r,
        enabled: r.isActive,
        serviceName: r.service || "*",
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────── GET /api/v1/alerts/history ──────────────────── */

/**
 * Fetch persisted fired alert history from MongoDB.
 */
const getAlertHistory = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const activeTenant = req.tenantId || "default-tenant";

    const history = await AlertHistory.find({ tenantId: activeTenant })
      .sort({ firedAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.json({ history });
  } catch (err) {
    next(err);
  }
};

/* ──────────────── DELETE /api/v1/alerts/history ───────────────── */

/**
 * Clear persisted alert history for current tenant.
 */
const clearAlertHistory = async (req, res, next) => {
  try {
    const activeTenant = req.tenantId || "default-tenant";
    await AlertHistory.deleteMany({ tenantId: activeTenant });
    return res.json({ message: "Alert history cleared" });
  } catch (err) {
    next(err);
  }
};

/* ──────────────── GET /api/v1/alerts/:id ──────────────────────── */

/**
 * Get a single alert rule by ID.
 */
const getAlertById = async (req, res, next) => {
  try {
    const activeTenant = req.tenantId || "default-tenant";
    const rule = await AlertRule.findOne({ _id: req.params.id, tenantId: activeTenant }).lean();

    if (!rule) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    return res.json({
      rule: {
        ...rule,
        enabled: rule.isActive,
        serviceName: rule.service || "*",
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────── PATCH /api/v1/alerts/:id ────────────────────── */

/**
 * Partially update an alert rule.
 */
const updateAlert = async (req, res, next) => {
  try {
    const allowed = ["name", "service", "serviceName", "level", "keyword", "webhookUrl", "isActive", "enabled", "thresholdCount"];
    const updates = {};
    const activeTenant = req.tenantId || "default-tenant";

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "serviceName") updates.service = req.body[key];
        else if (key === "enabled") updates.isActive = req.body[key];
        else if (key === "thresholdCount") updates.thresholdCount = Math.max(1, Number(req.body[key]) || 5);
        else updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const rule = await AlertRule.findOneAndUpdate(
      { _id: req.params.id, tenantId: activeTenant },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    return res.json({
      message: "Alert rule updated",
      rule: {
        ...rule.toObject(),
        enabled: rule.isActive,
        serviceName: rule.service || "*",
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ──────────────── DELETE /api/v1/alerts/:id & /api/alerts/:id ───── */

/**
 * Permanently delete an alert rule.
 */
const deleteAlert = async (req, res, next) => {
  try {
    const activeTenant = req.tenantId || "default-tenant";
    const rule = await AlertRule.findOneAndDelete({ _id: req.params.id, tenantId: activeTenant });

    if (!rule) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    return res.json({ message: "Alert rule deleted", id: rule._id });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAlert,
  getAlerts,
  getAlertHistory,
  clearAlertHistory,
  getAlertById,
  updateAlert,
  deleteAlert,
};
