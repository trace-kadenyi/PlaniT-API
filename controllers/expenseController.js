const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const mongoose = require("mongoose");

// Create new expense
const createExpense = async (req, res) => {
  try {
    // Verify event exists (through budget)
    const budget = await Budget.findOne({ eventId: req.body.eventId });
    if (!budget) {
      return res.status(404).json({ message: "Event budget not found" });
    }

    // Optionally check budget constraints
    if (req.body.amount > budget.totalBudget) {
      return res.status(400).json({
        message: "Expense amount exceeds total budget",
      });
    }

    const expense = new Expense(req.body);
    await expense.save();
    res.status(201).json(expense);
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
    res.json(expenses);
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
    res.json(expense);
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
    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get expenses summary by category
const getExpensesSummary = async (req, res) => {
  try {
    const summary = await Expense.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(req.params.eventId) } },
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


