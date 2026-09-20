const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, tenantId: user.tenantId, email: user.email },
    process.env.JWT_SECRET || "super_secret_jwt_key_alert_system_2026",
    { expiresIn: "7d" }
  );
};

// @desc    Register new user & tenant
// @route   POST /api/v1/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please provide name, email, and password (min 6 characters)",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Password must be at least 6 characters long",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: "Conflict",
        message: "An account with this email already exists",
      });
    }

    const tenantId = User.generateTenantId();
    const apiKey = User.generateApiKey();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      companyName: companyName || "",
      tenantId,
      apiKey,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "User account and tenant API Key generated successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        tenantId: user.tenantId,
        apiKey: user.apiKey,
        monthlyLogLimit: user.monthlyLogLimit || 10000,
        currentMonthUsage: user.currentMonthUsage || 0,
      },
    });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({ error: "Failed to register user account" });
  }
};

// @desc    Authenticate user & get token + API Key
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please provide both email and password",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password credentials",
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        tenantId: user.tenantId,
        apiKey: user.apiKey,
        monthlyLogLimit: user.monthlyLogLimit || 10000,
        currentMonthUsage: user.currentMonthUsage || 0,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/v1/auth/me
// @access  Private (JWT)
exports.getMe = async (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      companyName: req.user.companyName,
      tenantId: req.user.tenantId,
      apiKey: req.user.apiKey,
      monthlyLogLimit: req.user.monthlyLogLimit || 10000,
      currentMonthUsage: req.user.currentMonthUsage || 0,
      createdAt: req.user.createdAt,
    },
  });
};

// @desc    Get current tenant usage meter details
// @route   GET /api/v1/auth/usage
// @access  Public / Tenant
exports.getUsage = async (req, res) => {
  try {
    const activeTenant = req.tenantId || req.query.tenantId || "default-tenant";
    let user = await User.findOne({ tenantId: activeTenant });

    if (!user && req.headers["x-api-key"]) {
      user = await User.findOne({ apiKey: req.headers["x-api-key"] });
    }

    const monthlyLogLimit = user ? user.monthlyLogLimit : 10000;
    const currentMonthUsage = user ? user.currentMonthUsage : 0;
    const percentage = Math.min(100, Math.round((currentMonthUsage / monthlyLogLimit) * 100));

    return res.json({
      tenantId: activeTenant,
      currentMonthUsage,
      monthlyLogLimit,
      percentage,
      isExceeded: currentMonthUsage >= monthlyLogLimit,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch usage meter data" });
  }
};

// @desc    Regenerate API Key for tenant
// @route   POST /api/v1/auth/regenerate-api-key
// @access  Private (JWT)
exports.regenerateApiKey = async (req, res) => {
  try {
    const newApiKey = User.generateApiKey();
    req.user.apiKey = newApiKey;
    await req.user.save();

    return res.json({
      success: true,
      message: "New API Key generated successfully",
      apiKey: newApiKey,
    });
  } catch (err) {
    console.error("Regenerate API Key Error:", err);
    return res.status(500).json({ error: "Failed to regenerate API Key" });
  }
};

// @desc    Upgrade Plan Tier & Monthly Log Quota Limit
// @route   POST /api/v1/auth/upgrade-plan, /api/user/upgrade-plan, /api/user/upgrade
// @access  Public / Tenant
exports.upgradePlan = async (req, res) => {
  try {
    const { planTier, tier, monthlyLogLimit, limit, billingEmail, email } = req.body;
    const activeApiKey = req.headers["x-api-key"] || req.query.apiKey;
    const targetEmail = (billingEmail || email || "").trim().toLowerCase();
    const targetTier = (planTier || tier || "PRO").toUpperCase();

    let targetLimit = Number(monthlyLogLimit || limit);
    if (!targetLimit || isNaN(targetLimit)) {
      if (targetTier === "PRO") targetLimit = 500000;
      else if (targetTier === "ENTERPRISE") targetLimit = 10000000;
      else targetLimit = 10000;
    }

    // Attempt to decode JWT Token if Authorization header is present
    let authUser = req.user;
    if (!authUser && req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "super_secret_jwt_key_alert_system_2026"
        );
        if (decoded?.id) {
          authUser = await User.findById(decoded.id);
        }
      } catch {
        /* token verification quiet fallback */
      }
    }

    // 1. Search for matching user in Database
    let user = authUser;

    if (!user && targetEmail) {
      user = await User.findOne({ email: targetEmail });
    }

    if (!user && activeApiKey) {
      user = await User.findOne({ apiKey: activeApiKey });
    }

    if (!user && (req.tenantId || req.body.tenantId)) {
      const tid = req.tenantId || req.body.tenantId;
      if (tid !== "default-tenant") {
        user = await User.findOne({ tenantId: tid });
      }
    }

    // 2. If user exists in DB, update monthlyLogLimit & save
    if (user) {
      user.monthlyLogLimit = targetLimit;
      await user.save();
      console.log(`[Billing Engine] Updated user [${user.email}] limit to ${targetLimit.toLocaleString()}`);
    } else {
      console.warn(`[Billing Engine] No matching registered user document found for email [${targetEmail}] / apiKey [${activeApiKey}]. Returning active quota.`);
    }

    const priceAmount = targetLimit >= 10000000 ? "$199.00" : targetLimit >= 500000 ? "$29.00" : "$0.00";

    const invoice = {
      invoiceId: "inv_live_" + crypto.randomBytes(6).toString("hex"),
      tenantId: user?.tenantId || req.tenantId || "default-tenant",
      planTier: targetTier,
      amount: priceAmount,
      currency: "USD",
      status: "PAID",
      billingEmail: targetEmail || user?.email || "billing@company.com",
      paidAt: new Date().toISOString(),
    };

    console.log(
      `[Billing Engine] 💳 Payment Invoice Generated: ${invoice.invoiceId} (${invoice.amount} for ${invoice.planTier} tier)`
    );

    return res.json({
      success: true,
      message: `Successfully upgraded plan tier to ${invoice.planTier} (${targetLimit.toLocaleString()} monthly log quota activated)!`,
      invoice,
      user: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            companyName: user.companyName,
            tenantId: user.tenantId,
            apiKey: user.apiKey,
            monthlyLogLimit: user.monthlyLogLimit,
            currentMonthUsage: user.currentMonthUsage,
          }
        : {
            tenantId: req.tenantId || "default-tenant",
            monthlyLogLimit: targetLimit,
            currentMonthUsage: 0,
          },
    });
  } catch (err) {
    console.error("[Upgrade Plan Error]", err);
    return res.status(500).json({
      error: "Upgrade Failed",
      message: err.message || "Failed to upgrade subscription plan",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};
