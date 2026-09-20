const mongoose = require("mongoose");

const alertHistorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      default: "default-tenant",
      trim: true,
      required: true,
      index: true,
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AlertRule",
    },
    ruleName: {
      type: String,
      default: "Alert Rule",
      trim: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    keyword: {
      type: String,
      default: "",
      trim: true,
    },
    level: {
      type: String,
      default: "INFO",
    },
    message: {
      type: String,
      required: true,
    },
    webhookUrl: {
      type: String,
    },
    firedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

alertHistorySchema.index({ tenantId: 1, firedAt: -1 });

module.exports = mongoose.model("AlertHistory", alertHistorySchema);
