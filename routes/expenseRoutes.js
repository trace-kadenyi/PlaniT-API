const express = require("express");
const router = express.Router();

const {
  createExpense,
  getExpensesByEventId,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesSummary,
  getAllExpenses,
  getBudgetStatusForAllEvents,
  getExpenseAuditLogs,
} = require("../controllers/expenseController");
const authController = require("../controllers/authController");

// create expense
router.post("/", authController.protect, createExpense);

// get budget status
router.get(
  "/budget-status",
  authController.protect,
  getBudgetStatusForAllEvents
);

// get expenses by event id
router.get("/event/:eventId", authController.protect, getExpensesByEventId);

// get single expense
router.get("/:id", authController.protect, getExpenseById);

// update expense
// router.put("/:id", authController.protect, updateExpense);

router.put(
  "/:id",
  authController.protect,
  authController.restrictTo("planner", "admin", "super_admin"),
  updateExpense
);

// delete expense
// router.delete("/:id", authController.protect, deleteExpense);
router.delete(
  "/:id",
  authController.protect,
  authController.restrictTo("planner", "admin", "super_admin"),
  deleteExpense
);

// expenses summary
router.get("/:eventId/summary", authController.protect, getExpensesSummary);

// get all expenses
router.get("/", authController.protect, getAllExpenses);

// Audit logs - only admins and super admins can view
router.get(
  "/audit-logs",
  authController.protect,
  authController.restrictTo("admin", "super_admin"),
  getExpenseAuditLogs
);

module.exports = router;
