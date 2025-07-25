const Expense = require("../models/ExpenseSchema");
const Budget = require("../models/BudgetSchema");
const mongoose = require("mongoose");

// Create new expense
const createExpense = async (req, res) => {
  try {
    // Verify event exists (through budget)
    const budget = await Budget.findOne({ eventId: req.body.eventId });
    if (!budget) {
      return res.status(404).json({ message: "Event budget not found" });
    }

    // Calculate remaining budget
    const expenses = await Expense.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(String(req.body.eventId)),
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpenses = expenses[0]?.total || 0;
    const remainingBudget = budget.totalBudget - totalExpenses;

    // Validate against remaining budget (NEW CODE)
    if (req.body.amount > remainingBudget) {
      return res.status(400).json({
        message: `Expense exceeds remaining budget ($${remainingBudget} available)`,
      });
    }

    const expense = new Expense(req.body);
    await expense.save();
    // Get updated balance
    const updatedExpenses = await Expense.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(String(req.body.eventId)),
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const newRemaining = budget.totalBudget - (updatedExpenses[0]?.total || 0);

    res.status(201).json({
      expense,
      budgetStatus: {
        totalBudget: budget.totalBudget,
        totalExpenses: updatedExpenses[0]?.total || 0,
        remainingBudget: newRemaining,
      },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(err.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// Get all expenses for an event
const getExpensesByEventId = async (req, res) => {
  try {
    const [expenses, budget] = await Promise.all([
      Expense.find({ eventId: req.params.eventId }).sort({ createdAt: -1 }),
      Budget.findOne({ eventId: req.params.eventId }),
    ]);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      expenses,
      budgetStatus: {
        totalBudget: budget.totalBudget,
        totalExpenses,
        remainingBudget: budget.totalBudget - totalExpenses,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get expense by ID
const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    // Calculate new balance
    const budget = await Budget.findOne({ eventId: expense.eventId });
    const expenses = await Expense.aggregate([
      { $match: { eventId: expense.eventId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      expense,
      budgetStatus: {
        totalBudget: budget.totalBudget,
        totalExpenses: expenses[0]?.total || 0,
        remainingBudget: budget.totalBudget - (expenses[0]?.total || 0),
      },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(err.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    // Get new balance
    const budget = await Budget.findOne({ eventId: expense.eventId });
    const remainingExpenses = await Expense.aggregate([
      { $match: { eventId: expense.eventId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      message: "Expense deleted successfully",
      budgetStatus: {
        totalBudget: budget.totalBudget,
        totalExpenses: remainingExpenses[0]?.total || 0,
        remainingBudget:
          budget.totalBudget - (remainingExpenses[0]?.total || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get expenses summary by category
const getExpensesSummary = async (req, res) => {
  try {
    const summary = await Expense.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(String(req.params.eventId)),
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createExpense,
  getExpensesByEventId,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesSummary,
};
