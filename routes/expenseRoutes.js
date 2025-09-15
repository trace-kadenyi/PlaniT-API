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
} = require("../controllers/expenseController");

// create expense
router.post("/", createExpense);

// get budget status
router.get("/budget-status", getBudgetStatusForAllEvents);

// get expenses by event id
router.get("/event/:eventId", getExpensesByEventId);

// get single expense
router.get("/:id", getExpenseById);

// update expense
router.put("/:id", updateExpense);

// delete expense
router.delete("/:id", deleteExpense);

// expenses summary
router.get("/:eventId/summary", getExpensesSummary);

// get all expenses
router.get("/", getAllExpenses);

module.exports = router;
