const User = require("../models/User");

/**
 * Multi-Tenant API Key Authentication Middleware
 *
 * Inspects 'x-api-key' header or query parameter.
 * Looks up registered tenant/user by API Key for data isolation.
 */
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;
  const legacyApiKey = process.env.API_KEY || "log_secret_api_key_123";

  if (!apiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing x-api-key request header",
    });
  }

  try {
    // 1. Check if matching user exists for this API Key
    const user = await User.findOne({ apiKey }).select("-password");

    if (user) {
      req.user = user;
      req.tenantId = user.tenantId;
      return next();
    }

    // 2. Check legacy default API Key fallback
    if (apiKey === legacyApiKey) {
      req.tenantId = "default-tenant";
      return next();
    }

    // 3. Invalid API key provided
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid x-api-key provided",
    });
  } catch (err) {
    console.error("API Key Auth Error:", err.message);
    return res.status(500).json({ error: "Authentication system error" });
  }
};

module.exports = apiKeyAuth;
