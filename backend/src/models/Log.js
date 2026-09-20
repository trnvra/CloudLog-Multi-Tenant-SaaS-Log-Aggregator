const mongoose = require("mongoose");

const LOG_LEVELS = ["INFO", "WARN", "ERROR", "FATAL"];

const logSchema = new mongoose.Schema(
  {
    /** Multi-tenant identifier (e.g. tenant-123, default-tenant) */
    tenantId: {
      type: String,
      default: "default-tenant",
      trim: true,
      maxlength: 128,
      index: true,
    },

    serviceName: {
      type: String,
      required: [true, "serviceName is required"],
      trim: true,
      maxlength: 128,
    },

    level: {
      type: String,
      required: true,
      enum: {
        values: LOG_LEVELS,
        message: "{VALUE} is not a valid log level",
      },
      default: "INFO",
    },

    message: {
      type: String,
      required: [true, "message is required"],
      maxlength: 4096,
    },

    /** Free-form payload — request IDs, stack traces, metrics, etc. */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    /** Disable __v; use timestamps option only for createdAt/updatedAt bookkeeping */
    versionKey: false,
    timestamps: true,
  }
);

/* ──────────────────────────── Indexes ──────────────────────────── */

// Primary query pattern: filter by tenant + service + level, newest first
logSchema.index({ tenantId: 1, serviceName: 1, level: 1, timestamp: -1 });

// TTL Index — Auto-expire logs after 7 days (604800 seconds)
logSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 604800 } // 7 days (604800 seconds)
);

// Full-text search on message field for keyword alerting
logSchema.index({ message: "text" });

module.exports = mongoose.model("Log", logSchema);
module.exports.LOG_LEVELS = LOG_LEVELS;
