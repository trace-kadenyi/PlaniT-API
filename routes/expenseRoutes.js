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
  getDeletedPaidExpensesLog,
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
router.put("/:id", authController.protect, updateExpense);

// delete expense
router.delete("/:id", authController.protect, deleteExpense);

// expenses summary
router.get("/:eventId/summary", authController.protect, getExpensesSummary);

// get all expenses
router.get("/", authController.protect, getAllExpenses);

router.get(
  "/deleted-paid-expenses/log",
  authController.protect,
  authController.restrictTo("super_admin"),
  getDeletedPaidExpensesLog
);

module.exports = router;
