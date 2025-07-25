const express = require("express");
const router = express.Router();
const {
  createExpense,
  getExpensesByEventId,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesSummary,
} = require("../controllers/expenseController");

router.post("/", createExpense);
router.get("/event/:eventId", getExpensesByEventId);
router.get("/:id", getExpenseById);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);
router.get("/:eventId/summary", getExpensesSummary);

module.exports = router;
