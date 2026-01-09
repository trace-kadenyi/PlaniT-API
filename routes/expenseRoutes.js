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
// router.post("/", authController.protect, createExpense);
// create expense - planners, admins, super_admins only
router.post(
  "/",
  authController.protect,
  authController.restrictTo("planner", "admin", "super_admin"),
  createExpense
);

// get budget status - all authenticated users
router.get(
  "/budget-status",
  authController.protect,
  getBudgetStatusForAllEvents
);

// get expenses by event id - all authenticated users
router.get("/event/:eventId", authController.protect, getExpensesByEventId);

// get single expense - all authenticated users
router.get("/:id", authController.protect, getExpenseById);

// update expense
// router.put("/:id", authController.protect, updateExpense);

// update expense - planners, admins, super_admins only
router.put(
  "/:id",
  authController.protect,
  authController.restrictTo("planner", "admin", "super_admin"),
  updateExpense
);

// delete expense
// router.delete("/:id", authController.protect, deleteExpense);
// delete expense - planners, admins, super_admins only
router.delete(
  "/:id",
  authController.protect,
  authController.restrictTo("planner", "admin", "super_admin"),
  deleteExpense
);

// expenses summary - all authenticated users
router.get("/:eventId/summary", authController.protect, getExpensesSummary);

// get all expenses - all authenticated users
router.get("/", authController.protect, getAllExpenses);

// Audit logs - only admins and super admins can view
router.get(
  "/audit-logs",
  authController.protect,
  authController.restrictTo("admin", "super_admin"),
  getExpenseAuditLogs
);

module.exports = router;
