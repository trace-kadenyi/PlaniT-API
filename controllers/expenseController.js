const mongoose = require("mongoose");

const Budget = require("../models/BudgetSchema");
const Expense = require("../models/ExpenseSchema");
const { getBudgetStatus } = require("../utils/budgetHelpers");

// Create new expense
const createExpense = async (req, res) => {
  try {
    const budgetStatus = await getBudgetStatus(req.body.eventId);
    
    // Enhanced validation
    if (budgetStatus.totalBudget === 0) {
      return res.status(404).json({ message: "Event budget not found" });
    }
    
    if (req.body.amount > budgetStatus.remainingBudget) {
      return res.status(400).json({
        message: `Expense exceeds remaining budget ($${budgetStatus.remainingBudget} available)`,
        remainingBudget: budgetStatus.remainingBudget,
        attemptedAmount: req.body.amount
      });
    }

    const expense = new Expense(req.body);
    await expense.save();

    res.status(201).json({
      expense,
      budgetStatus: await getBudgetStatus(req.body.eventId),
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
    const expenses = await Expense.find({ eventId: req.params.eventId }).sort({
      createdAt: -1,
    });

    const budgetStatus = await getBudgetStatus(req.params.eventId);

    if (budgetStatus.totalBudget === 0) {
      return res.status(404).json({ message: "Event budget not found" });
    }

    res.json({ expenses, budgetStatus });
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

    const budgetStatus = await getBudgetStatus(expense.eventId);
    if (budgetStatus.totalBudget === 0) {
      return res.status(404).json({ message: "Event budget not found" });
    }
    res.json({
      expense,
      budgetStatus: await getBudgetStatus(expense.eventId), // ✅ Cleaner
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

    res.json({
      message: "Expense deleted successfully",
      budgetStatus: await getBudgetStatus(expense.eventId), // ✅ Consistent
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

    res.json({
      categories: summary,
      budgetStatus: await getBudgetStatus(req.params.eventId),
    });
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
