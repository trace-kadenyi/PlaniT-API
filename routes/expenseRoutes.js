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

// protect all routes
router.use(authController.protect);

// Audit logs - only admins and super admins can view
router.get(
  "/audit-logs",

  authController.restrictTo("admin", "super_admin"),
  getExpenseAuditLogs,
);

// 🔴 Audit log for deleted events
router.get(
  "/audit-logs/deleted-events",

  authController.restrictTo("admin", "super_admin"),
  getDeletedEventExpenseLogs,
);

// create expense - planners, admins, super_admins only
router.post(
  "/",

  authController.restrictTo("planner", "admin", "super_admin"),
  createExpense,
);

// get budget status - all authenticated users
router.get(
  "/budget-status",

  getBudgetStatusForAllEvents,
);

// get expenses by event id - all authenticated users
router.get("/event/:eventId", getExpensesByEventId);

// get single expense - all authenticated users
router.get("/:id", getExpenseById);

// update expense - planners, admins, super_admins only
router.put(
  "/:id",
  authController.restrictTo("planner", "admin", "super_admin"),
  updateExpense,
);

// delete expense - planners, admins, super_admins only
router.delete(
  "/:id",
  authController.restrictTo("planner", "admin", "super_admin"),
  deleteExpense,
);

// expenses summary - all authenticated users
router.get("/:eventId/summary", getExpensesSummary);

// get all expenses - all authenticated users
router.get("/", getAllExpenses);

module.exports = router;
