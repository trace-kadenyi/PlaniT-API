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
  getDeletedEventExpenseLogs,
} = require("../controllers/expenseController");
const authController = require("../controllers/authController");

// Audit logs - only admins and super admins can view
router.get(
  "/audit-logs",
  authController.protect,
  authController.restrictTo("admin", "super_admin"),
  getExpenseAuditLogs,
);

// 🔴 Audit log for deleted events
router.get(
  "/audit-logs/deleted-events",
  authController.protect,
  authController.restrictTo("admin", "super_admin"),
  getDeletedEventExpenseLogs,
);

// create expense - planners, admins, super_admins only
router.post(
  "/",
  authController.protect,
  authController.restrictTo("planner", "admin", "super_admin"),
  createExpense,
);

// get budget status - all authenticated users
router.get(
  "/budget-status",
  authController.protect,
  getBudgetStatusForAllEvents,
);

// get expenses by event id - all authenticated users
router.get("/event/:eventId", authController.protect, getExpensesByEventId);

// get single expense - all authenticated users
router.get("/:id", authController.protect, getExpenseById);

// update expense - planners, admins, super_admins only
router.put(
  "/:id",
  authController.protect,
  authController.restrictTo("planner", "admin", "super_admin"),
  updateExpense,
);

// delete expense - planners, admins, super_admins only
router.delete(
  "/:id",
  authController.protect,
  authController.restrictTo("planner", "admin", "super_admin"),
  deleteExpense,
);

// expenses summary - all authenticated users
router.get("/:eventId/summary", authController.protect, getExpensesSummary);

// get all expenses - all authenticated users
router.get("/", authController.protect, getAllExpenses);

module.exports = router;
