const express = require("express");
const router = express.Router();

const {
  getBudgetByEventId,
  updateBudget,
} = require("../controllers/budgetController");
const { authorize } = require("../middleware/authmiddleware");
const { PERMISSIONS, RESOURCES } = require("../services/permissionService");
const authController = require("../controllers/authController");

// protect all routes
router.use(authController.protect);

// Get budget by event ID
router.get(
  "/:eventId",
  authorize(PERMISSIONS.VIEW, RESOURCES.BUDGET),
  getBudgetByEventId,
);

// Update event by ID
router.put(
  "/:eventId",
  authorize(PERMISSIONS.EDIT, RESOURCES.BUDGET),
  updateBudget,
);

module.exports = router;
