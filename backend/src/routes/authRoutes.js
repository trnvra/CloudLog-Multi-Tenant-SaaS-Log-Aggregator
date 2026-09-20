const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const jwtAuth = require("../middleware/jwtAuth");

router.post("/signup", authController.signup);
router.post("/register", authController.signup);
router.post("/login", authController.login);
router.get("/me", jwtAuth, authController.getMe);
router.get("/usage", authController.getUsage);
router.post("/upgrade-plan", authController.upgradePlan);
router.post("/upgrade", authController.upgradePlan);
router.post("/regenerate-api-key", jwtAuth, authController.regenerateApiKey);

module.exports = router;
