const jwt = require("jsonwebtoken");
const User = require("../models/User");

const jwtAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token missing or invalid Bearer format",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "super_secret_jwt_key_alert_system_2026"
    );

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User account no longer exists",
      });
    }

    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Token verification failed or expired",
    });
  }
};

module.exports = jwtAuth;
