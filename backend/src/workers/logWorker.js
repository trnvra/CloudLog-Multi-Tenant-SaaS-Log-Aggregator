const { Worker } = require("bullmq");
const Log = require("../models/Log");
const AlertRule = require("../models/AlertRule");
const AlertHistory = require("../models/AlertHistory");
const { getRedisConfig } = require("../config/db");
const { getIO } = require("../config/socketManager");
const { logQueue, QUEUE_NAME } = require("../queues/logQueue");
const {
  queueLagGauge,
  workerProcessingHistogram,
} = require("../config/metrics");

/* ──────────────── Batch Buffer Configuration ──────────────────── */

const BATCH_SIZE = 50;            // flush after N logs
const FLUSH_INTERVAL_MS = 2000;   // …or every 2 seconds, whichever comes first

let buffer = [];
let flushTimer = null;

/* ──────────────────── Batch Insert Logic ──────────────────────── */

/**
 * Update BullMQ queue waiting jobs gauge metric for Prometheus
 */
const updateQueueMetrics = async () => {
  try {
    const waitingCount = await logQueue.getWaitingCount();
    queueLagGauge.set({ queue: QUEUE_NAME }, waitingCount);
  } catch {
    /* quiet fallback if Redis is busy */
  }
};

/**
 * Flush accumulated buffer into MongoDB with insertMany
 * and evaluate each log against active alert rules.
 */
const flushBuffer = async () => {
  if (buffer.length === 0) return;

  const endTimer = workerProcessingHistogram.startTimer();
  const batch = buffer;
  buffer = [];

  try {
    // 1. Bulk insert logs
    const inserted = await Log.insertMany(batch, { ordered: false });
    console.log(`[Worker] Flushed ${inserted.length} logs to MongoDB`);

    // 2. Broadcast to WebSocket clients
    broadcastLogs(inserted);

    // 3. Evaluate alert rules against batch
    await evaluateAlerts(inserted);
  } catch (err) {
    console.error("[Worker] Batch insert error:", err.message);

    if (err.name === "MongoBulkWriteError" && err.insertedDocs?.length) {
      console.warn(`[Worker] Partial insert: ${err.insertedDocs.length} succeeded`);
      broadcastLogs(err.insertedDocs);
      await evaluateAlerts(err.insertedDocs);
    }
  } finally {
    endTimer();
    updateQueueMetrics();
  }
};

/* ───────────────── WebSocket Broadcasting ─────────────────────── */

/**
 * Emit inserted logs to connected Socket.io clients.
 */
const broadcastLogs = (logs) => {
  try {
    const io = getIO();

    for (const log of logs) {
      const payload = {
        _id: log._id,
        tenantId: log.tenantId,
        serviceName: log.serviceName,
        level: log.level,
        message: log.message,
        metadata: log.metadata,
        timestamp: log.timestamp,
      };

      io.emit("new-log", payload);

      if (log.tenantId) {
        io.to(`tenant:${log.tenantId}`).emit("new-log", payload);
      }

      io.to(`service:${log.serviceName}`).emit("new-log", payload);
    }
  } catch (err) {
    console.warn("[Worker] WebSocket broadcast skipped:", err.message);
  }
};

/* ────────────────────── Alert Evaluation ──────────────────────── */

/**
 * Evaluate inserted logs against active AlertRules.
 */
const evaluateAlerts = async (logs) => {
  try {
    const tenantIds = [...new Set(logs.map((l) => l.tenantId || "default-tenant"))];

    // Fetch active rules for these tenants
    const rules = await AlertRule.find({
      $or: [{ isActive: true }, { enabled: true }],
      tenantId: { $in: tenantIds },
    }).lean();

    if (rules.length === 0) return;

    for (const log of logs) {
      const logTenant = log.tenantId || "default-tenant";

      for (const rule of rules) {
        const ruleService = rule.service || rule.serviceName || "ALL";
        const ruleLevel = (rule.level || "ALL").toUpperCase();
        const ruleKeyword = rule.keyword || "";

        const tenantMatch = rule.tenantId === logTenant;

        const serviceMatch =
          ruleService === "*" ||
          ruleService === "ALL" ||
          ruleService === log.serviceName;

        const levelMatch =
          ruleLevel === "ALL" ||
          ruleLevel === log.level;

        const keywordMatch =
          !ruleKeyword ||
          ruleKeyword.trim() === "" ||
          (log.message && log.message.toLowerCase().includes(ruleKeyword.toLowerCase()));

        if (tenantMatch && serviceMatch && levelMatch && keywordMatch) {
          const ruleName = rule.name || "Alert Rule";
          const threshold = Math.max(1, rule.thresholdCount || 5);

          // 1. Increment trigger count in DB and get updated count
          const updatedRule = await AlertRule.findByIdAndUpdate(
            rule._id,
            { $inc: { triggerCount: 1 } },
            { new: true }
          ).catch(() => null);

          const currentCount = updatedRule ? updatedRule.triggerCount : (rule.triggerCount || 0) + 1;
          rule.triggerCount = currentCount;

          // 2. Check if occurrence count has reached/exceeded threshold (e.g. 5x, 10x, 15x...)
          const isThresholdReached = currentCount % threshold === 0;

          if (isThresholdReached) {
            console.log(
              `[Alert] 🚨 Threshold hit! Rule "${ruleName}" matched ${currentCount}/${threshold} times. Dispatching alert error!`
            );

            // 3. Save fired alert to MongoDB
            AlertHistory.create({
              tenantId: logTenant,
              ruleId: rule._id,
              ruleName,
              serviceName: log.serviceName,
              keyword: ruleKeyword,
              level: log.level,
              message: `[THRESHOLD REACHED (${currentCount}/${threshold}x)] ${log.message}`,
              webhookUrl: rule.webhookUrl,
              firedAt: new Date(),
            }).catch((err) => console.warn("[AlertHistory] Save error:", err.message));

            // 4. Emit Socket.io real-time alert event
            try {
              getIO().emit("alert-triggered", {
                tenantId: logTenant,
                rule: {
                  id: rule._id,
                  name: ruleName,
                  service: ruleService,
                  level: ruleLevel,
                  keyword: ruleKeyword,
                  webhookUrl: rule.webhookUrl,
                  triggerCount: currentCount,
                  thresholdCount: threshold,
                },
                log: {
                  serviceName: log.serviceName,
                  level: log.level,
                  message: log.message,
                  timestamp: log.timestamp,
                },
                firedAt: new Date().toISOString(),
              });
              console.log(
                `[Alert] 🚨 Real-time alert emitted for "${ruleName}" (${currentCount}/${threshold} matches)`
              );
            } catch (err) {
              console.warn("[Alert] Socket emit skipped:", err.message);
            }

            // 5. Dispatch HTTP Webhook to Discord / Slack / Generic URL
            dispatchWebhook(rule, log, currentCount, threshold).catch((err) => {
              console.error(`[Alert] Webhook failed → ${rule.webhookUrl}:`, err.message);
            });
          } else {
            console.log(
              `[Alert] ℹ️ Match recorded for "${ruleName}" (${currentCount}/${threshold} matches towards threshold)`
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("[Alert] Evaluation error:", err.message);
  }
};

/**
 * Format and POST payload to Discord, Slack, or Generic HTTP Webhook URL.
 */
const dispatchWebhook = async (rule, log, currentCount = 5, threshold = 5) => {
  const url = rule.webhookUrl;
  let bodyPayload;

  // Discord Webhook Formatter
  if (url.includes("discord.com/api/webhooks") || url.includes("discordapp.com/api/webhooks")) {
    const embedColor =
      log.level === "FATAL" || log.level === "ERROR"
        ? 15158332 // Red
        : log.level === "WARN"
        ? 16776960 // Yellow
        : 3447003; // Blue

    bodyPayload = {
      username: "CloudLog Alert Bot",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/1183/1183672.png",
      embeds: [
        {
          title: `🚨 Alert Threshold Reached (${currentCount}/${threshold}x): ${rule.name || "Rule Triggered"}`,
          description: `\`\`\`${log.message}\`\`\``,
          color: embedColor,
          fields: [
            { name: "Service", value: `\`${log.serviceName}\``, inline: true },
            { name: "Severity Level", value: `\`${log.level}\``, inline: true },
            { name: "Keyword Match", value: rule.keyword ? `\`${rule.keyword}\`` : "`ANY`", inline: true },
            { name: "Occurrence Count", value: `\`${currentCount} / ${threshold}\``, inline: true },
          ],
          footer: { text: "Cloud-Native SaaS Log Aggregator" },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
  // Slack Webhook Formatter
  else if (url.includes("hooks.slack.com")) {
    bodyPayload = {
      text: `🚨 *Alert Threshold Reached (${currentCount}/${threshold}x)*: ${rule.name || "Rule Match"}`,
      attachments: [
        {
          color: log.level === "ERROR" || log.level === "FATAL" ? "#EF4444" : "#F59E0B",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Service:* \`${log.serviceName}\` | *Level:* \`${log.level}\` | *Count:* \`${currentCount}/${threshold}\`\n*Message:* ${log.message}`,
              },
            },
          ],
        },
      ],
    };
  }
  // Generic HTTP Webhook
  else {
    bodyPayload = {
      alert: true,
      tenantId: rule.tenantId,
      rule: {
        id: rule._id,
        name: rule.name || "Alert Rule",
        service: rule.service || "ALL",
        level: rule.level || "ALL",
        keyword: rule.keyword || "",
        triggerCount: currentCount,
        thresholdCount: threshold,
      },
      log: {
        serviceName: log.serviceName,
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
      },
      firedAt: new Date().toISOString(),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[Alert] Webhook ${url} responded status ${res.status}`);
    } else {
      console.log(`[Alert] ✓ Webhook successfully dispatched to ${url}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

/* ────────────────────── BullMQ Worker ─────────────────────────── */

const startLogWorker = () => {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      buffer.push(job.data);
      updateQueueMetrics();

      if (buffer.length >= BATCH_SIZE) {
        clearTimeout(flushTimer);
        flushTimer = null;
        await flushBuffer();
      } else if (!flushTimer) {
        flushTimer = setTimeout(async () => {
          flushTimer = null;
          await flushBuffer();
        }, FLUSH_INTERVAL_MS);
      }
    },
    {
      connection: getRedisConfig(),
      concurrency: 10,
      limiter: {
        max: 1000,
        duration: 1000,
      },
    }
  );

  worker.on("ready", () => {
    console.log(`[Worker] Listening on queue "${QUEUE_NAME}"`);
    updateQueueMetrics();
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Worker] Runtime error:", err.message);
  });

  const shutdown = async () => {
    console.log("[Worker] Shutting down — flushing remaining buffer…");
    clearTimeout(flushTimer);
    await flushBuffer();
    await worker.close();
    console.log("[Worker] Closed");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return worker;
};

module.exports = { startLogWorker };
