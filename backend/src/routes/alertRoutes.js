const { Router } = require("express");
const {
  createAlert,
  getAlerts,
  getAlertHistory,
  clearAlertHistory,
  getAlertById,
  updateAlert,
  deleteAlert,
} = require("../controllers/alertController");
const apiKeyAuth = require("../middleware/apiKeyAuth");

const router = Router();

// Require tenant API Key for all alert management routes
router.use(apiKeyAuth);

/**
 * POST   /api/v1/alerts         → Create a new alert rule
 * GET    /api/v1/alerts         → List alert rules (with filters & pagination)
 * GET    /api/v1/alerts/history → List persisted fired alerts history
 * DELETE /api/v1/alerts/history → Clear alert history
 * GET    /api/v1/alerts/:id     → Get a single alert rule
 * PATCH  /api/v1/alerts/:id     → Update an alert rule
 * DELETE /api/v1/alerts/:id     → Delete an alert rule
 */
router.post("/", createAlert);
router.get("/", getAlerts);
router.get("/history", getAlertHistory);
router.delete("/history", clearAlertHistory);
router.get("/:id", getAlertById);
router.patch("/:id", updateAlert);
router.delete("/:id", deleteAlert);

module.exports = router;
