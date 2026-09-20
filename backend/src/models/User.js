const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    monthlyLogLimit: {
      type: Number,
      default: 10000,
      min: 100,
    },
    currentMonthUsage: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password instance method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static helper to generate unique API Key
userSchema.statics.generateApiKey = function () {
  return "ak_live_" + crypto.randomBytes(16).toString("hex");
};

// Static helper to generate unique Tenant ID
userSchema.statics.generateTenantId = function () {
  return "tenant_" + crypto.randomBytes(6).toString("hex");
};

module.exports = mongoose.model("User", userSchema);
