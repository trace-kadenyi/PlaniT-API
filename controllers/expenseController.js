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









