const Budget = require("../models/BudgetSchema");
const Expense = require("../models/ExpenseSchema");

const mongoose = require("mongoose");

// Get budget by event ID
const getBudgetByEventId = async (req, res) => {
  try {
    // 1️⃣ Validate event ownership FIRST
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizationId: req.user.organization,
    }).select("_id");

    if (!event) {
      return res.status(404).json({
        error: "EventNotFound",
        message: "Event not found or does not belong to your organization",
      });
    }

    // 2️⃣ Fetch budget (still org-scoped)
    const budget = await Budget.findOne({
      eventId: req.params.eventId,
      organizationId: req.user.organization,
    }).lean();

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    // Calculate total expenses
    const expenses = await Expense.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(String(req.params.eventId)),
          organizationId: new mongoose.Types.ObjectId(
            String(req.user.organization),
          ),
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      ...budget,
      totalExpenses: expenses[0]?.total || 0,
      remainingBudget: budget.totalBudget - (expenses[0]?.total || 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update budget
const updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ eventId: req.params.eventId });
    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    if (req.body.totalBudget !== undefined) {
      const expenses = await Expense.aggregate([
        {
          $match: {
            eventId: new mongoose.Types.ObjectId(String(req.params.eventId)),
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const totalExpenses = expenses[0]?.total || 0;
      if (req.body.totalBudget < totalExpenses) {
        return res.status(400).json({
          message: `New budget must be at least $${totalExpenses.toLocaleString()} (current expenses total)`,
        });
      }
    }

    const { totalBudget, notes } = req.body;
    Object.assign(budget, { totalBudget, notes });
    await budget.save();
    res.json(budget);
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

module.exports = { getBudgetByEventId, updateBudget };
