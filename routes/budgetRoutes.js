const express = require("express");
const router = express.Router();
const {
  getBudgetByEventId,
  updateBudget,
} = require("../controllers/budgetControllers");

// Get budget by event ID
router.get("events/:eventId", getBudgetByEventId);

// Update event by ID
router.put("events/:eventId", updateBudget);

module.exports = router;
