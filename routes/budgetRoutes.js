const express = require("express");
const router = express.Router();

const {
  getBudgetByEventId,
  updateBudget,
} = require("../controllers/budgetController");
const authController = require("../controllers/authController");

// Get budget by event ID
router.get("/:eventId", authController.protect, getBudgetByEventId);

// Update event by ID
router.put("/:eventId", authController.protect, updateBudget);

module.exports = router;
