const mongoose = require("mongoose");

const alertRuleSchema = new mongoose.Schema(
  {
    /** Multi-tenant identifier */
    tenantId: {
      type: String,
      default: "default-tenant",
      trim: true,
      required: true,
      index: true,
    },

    /** Rule display name */
    name: {
      type: String,
      default: "Alert Rule",
      trim: true,
      maxlength: 128,
    },

    /** Target service ("ALL", "*", or specific service name) */
    service: {
      type: String,
      default: "ALL",
      trim: true,
      maxlength: 128,
    },

    /** Target log severity level ("ALL", "INFO", "WARN", "ERROR", "FATAL") */
    level: {
      type: String,
      default: "ALL",
      trim: true,
      uppercase: true,
    },

    /** Substring keyword pattern to match against log message (Optional) */
    keyword: {
      type: String,
      default: "",
      trim: true,
      maxlength: 512,
    },

    /** Webhook endpoint URL (Discord, Slack, or generic HTTP POST) */
    webhookUrl: {
      type: String,
      required: [true, "webhookUrl is required"],
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/.+/i.test(v),
        message: "webhookUrl must be a valid HTTP(S) URL",
      },
    },

    /** Rule active status toggle */
    isActive: {
      type: Boolean,
      default: true,
    },

    /** Total count of triggered matches */
    triggerCount: {
      type: Number,
      default: 0,
    },

    /** Occurrence threshold count before firing alert (Default: 5) */
    thresholdCount: {
      type: Number,
      default: 5,
      min: 1,
    },
  },
  {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* Virtual aliases for backwards compatibility */
alertRuleSchema.virtual("serviceName").get(function () {
  return this.service || "*";
});

alertRuleSchema.virtual("enabled").get(function () {
  return this.isActive;
});

/* Indexes */
alertRuleSchema.index({ tenantId: 1, isActive: 1 });
alertRuleSchema.index(
  { tenantId: 1, name: 1, service: 1, level: 1, keyword: 1, webhookUrl: 1 },
  { unique: true }
);

module.exports = mongoose.model("AlertRule", alertRuleSchema);
