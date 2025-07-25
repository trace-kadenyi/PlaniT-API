const express = require("express");
const router = express.Router();
const {  createExpense,
  getExpensesByEventId,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesSummary} = require("../controllers/expenseController")


  router.post('/expenses', createExpense);
router.get('/events/:eventId/expenses', getExpensesByEventId);
router.get('/expenses/:id', getExpenseById);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);
router.get('/events/:eventId/expenses/summary', getExpensesSummary);

module.exports = router;
