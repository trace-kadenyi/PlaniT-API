const mongoose = require("mongoose");
const Budget = require("../models/BudgetSchema");
const Expense = require("../models/ExpenseSchema");

// get budget status
const getBudgetStatus = async (eventId) => {
  try {
    const [budget, expenses] = await Promise.all([
      Budget.findOne({ eventId }),
      Expense.aggregate([
        { $match: { eventId: new mongoose.Types.ObjectId(String(eventId)) } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    if (!budget) throw new Error("Budget not found");

    const totalExpenses = expenses[0]?.total || 0;

    return {
      totalBudget: budget.totalBudget,
      totalExpenses,
      remainingBudget: budget.totalBudget - totalExpenses,
    };
  } catch (err) {
    console.error("Budget status error:", err);
    return {
      totalBudget: 0,
      totalExpenses: 0,
      remainingBudget: 0,
    };
  }
};

module.exports = { getBudgetStatus };
