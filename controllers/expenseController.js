const mongoose = require("mongoose");

const Event = require("../models/EventSchema");
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
        attemptedAmount: req.body.amount,
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
    const existingExpense = await Expense.findById(req.params.id);
    if (!existingExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const budgetStatus = await getBudgetStatus(existingExpense.eventId);

    // Calculate potential new total if this update is applied
    const potentialAmount = req.body.amount || existingExpense.amount;
    const otherExpensesTotal =
      budgetStatus.totalExpenses - existingExpense.amount;
    const potentialRemaining =
      budgetStatus.totalBudget - (otherExpensesTotal + potentialAmount);

    if (potentialRemaining < 0) {
      return res.status(400).json({
        message: `Update would exceed budget by $${-potentialRemaining}. Please work within the available budget or increase it.`,
        maxAllowed: budgetStatus.totalBudget - otherExpensesTotal,
      });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      expense: updatedExpense,
      budgetStatus: await getBudgetStatus(existingExpense.eventId),
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
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Get associated event
    const event = await Event.findById(expense.eventId);
    if (!event) {
      return res.status(404).json({ message: "Associated event not found" });
    }

    // Check if event is completed
    if (event.status === "Completed") {
      return res.status(400).json({
        message: "Cannot delete expenses for completed events",
        resolution: "Please reopen the event if changes are needed",
      });
    }

    // Budget validation
    const budgetStatus = await getBudgetStatus(expense.eventId);
    if (!budgetStatus) {
      return res.status(404).json({ message: "Associated budget not found" });
    }

    // Payment status check
    if (expense.paymentStatus === "paid") {
      return res.status(400).json({
        message: "Paid expenses cannot be deleted",
        actionRequired: "Create a compensating expense instead",
        contact: "accounting@example.com",
      });
    }

    // Final deletion
    await Expense.findByIdAndDelete(req.params.id);

    res.json({
      message: "Expense deleted successfully",
      budgetStatus: await getBudgetStatus(expense.eventId),
      deletedExpense: {
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.createdAt,
      },
      newRemaining: (await getBudgetStatus(expense.eventId)).remainingBudget,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete expense",
      systemMessage: err.message,
      errorCode: "EXPENSE_DELETION_FAILED",
    });
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
