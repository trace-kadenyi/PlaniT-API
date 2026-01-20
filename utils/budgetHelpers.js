const Budget = require("../models/BudgetSchema");
const Expense = require("../models/ExpenseSchema");

const getBudgetStatus = async (eventId, organizationId) => {
  const budget = await Budget.findOne({ eventId, organizationId });

  if (!budget) {
    return {
      totalBudget: 0,
      totalExpenses: 0,
      remainingBudget: 0,
      budgetExists: false,
    };
  }

  // Optional: keep this for UI charts / summaries
  const totalExpensesAgg = await Expense.aggregate([
    { $match: { eventId: budget.eventId, organizationId } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const totalExpenses = totalExpensesAgg[0]?.total || 0;

  return {
    totalBudget: budget.totalBudget,
    spentAmount: budget.spentAmount,
    reservedAmount: budget.reservedAmount,
    totalExpenses, // informational only
    remainingBudget: budget.remainingBudget,
    deletedPaidTotal: budget.deletedPaidTotal || 0,
    budgetExists: true,
  };
};

module.exports = { getBudgetStatus };
