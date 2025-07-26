const express = require("express");
const router = express.Router();
const {
  getBudgetByEventId,
  updateBudget,
} = require("../controllers/budgetControllers");

// Get budget by event ID
router.get("/:eventId", getBudgetByEventId);

// Update event by ID
router.put("/:eventId", updateBudget);

module.exports = router;
