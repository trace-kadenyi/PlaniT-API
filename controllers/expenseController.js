const mongoose = require("mongoose");

const Event = require("../models/EventSchema");
const Expense = require("../models/ExpenseSchema");
const Budget = require("../models/BudgetSchema");
const ExpenseAuditLog = require("../models/ExpenseAuditLog")
const { getBudgetStatus } = require("../utils/budgetHelpers");

const MAX_DESCRIPTION = 150;
const MAX_NOTES = 200;

// Create new expense
const createExpense = async (req, res) => {
  try {
    const budgetStatus = await getBudgetStatus(req.body.eventId);

    // Enhanced validation
    if (budgetStatus.totalBudget === 0) {
      return res.status(404).json({
        error: "BudgetNotFound",
        message: "Event budget not found",
      });
    }

    // Check description length if provided
    if (req.body.description && req.body.description.length > MAX_DESCRIPTION) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Expense description cannot exceed ${MAX_DESCRIPTION} characters`,
        field: "description",
        maxLength: MAX_DESCRIPTION,
        currentLength: req.body.description.length,
      });
    }

    // Check notes length if provided
    if (req.body.notes && req.body.notes.length > MAX_NOTES) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Expense notes cannot exceed ${MAX_NOTES} characters`,
        field: "notes",
        maxLength: MAX_NOTES,
        currentLength: req.body.notes.length,
      });
    }

    // control: expense must be less than remaining budget
    if (req.body.amount > budgetStatus.remainingBudget) {
      return res.status(400).json({
        message: `Expense exceeds remaining budget ($${budgetStatus.remainingBudget.toFixed(
          2
        )} available). Top up your overall budget with $${(
          req.body.amount - budgetStatus.remainingBudget
        ).toFixed(2)} to add this expense.`,
        remainingBudget: budgetStatus.remainingBudget,
        attemptedAmount: req.body.amount,
      });
    }

    // Add createdBy from authenticated user
    const expenseData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const expense = new Expense(expenseData);
    await expense.save();

    const populatedExpense = await Expense.findById(expense._id)
      .populate("vendor", "name services")
      .populate("createdBy", "firstName lastName email");

    res.status(201).json({
      expense: populatedExpense,
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

// Get all expenses
const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all expenses for an event
const getExpensesByEventId = async (req, res) => {
  try {
    const expenses = await Expense.find({ eventId: req.params.eventId })
      .populate("vendor", "name services isArchived")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const budgetStatus = await getBudgetStatus(req.params.eventId);

    // Always return success with empty array if no expenses exist
    res.json({
      expenses: expenses || [],
      budgetStatus,
    });
  } catch (err) {
    // Return empty state instead of error
    res.json({
      expenses: [],
      budgetStatus: {
        totalBudget: 0,
        totalExpenses: 0,
        remainingBudget: 0,
        budgetExists: false,
      },
    });
  }
};

// Get expense by ID
const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("vendor", "name services")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

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
      return res.status(404).json({
        error: "NotFound",
        message: "Expense not found",
      });
    }

    // budget status
    const budgetStatus = await getBudgetStatus(existingExpense.eventId);

    // Calculate potential new total if this update is applied
    const potentialAmount = req.body.amount || existingExpense.amount;
    const otherExpensesTotal =
      budgetStatus.totalExpenses - existingExpense.amount;
    const potentialRemaining =
      budgetStatus.totalBudget - (otherExpensesTotal + potentialAmount);

    if (potentialRemaining < 0) {
      return res.status(400).json({
        message: `Update would exceed budget by $${-potentialRemaining.toFixed(
          2
        )}. Please work within the available budget or increase it.`,
        maxAllowed: budgetStatus.totalBudget - otherExpensesTotal,
      });
    }

    // Check description length if provided in update
    if (req.body.description && req.body.description.length > MAX_DESCRIPTION) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Description cannot exceed ${MAX_DESCRIPTION} characters`,
        field: "description",
        maxLength: MAX_DESCRIPTION,
        currentLength: req.body.description.length,
      });
    }

    // Check notes length if provided in update
    if (req.body.notes && req.body.notes.length > MAX_NOTES) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Notes cannot exceed ${MAX_NOTES} characters`,
        field: "notes",
        maxLength: MAX_NOTES,
        currentLength: req.body.notes.length,
      });
    }

    // Add updatedBy to the update data
    const { createdBy, ...safeUpdateData } = req.body; // Remove createdBy from request body
    const updateData = {
      ...safeUpdateData, // Spread everything EXCEPT createdBy
      updatedBy: req.user._id, // Set the user who made the update
    };

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("vendor", "name services")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

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

    // NEW: Check if expense is paid and user is not super_admin
    if (expense.paymentStatus === "paid" && req.user.role !== "super_admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only super administrators can delete paid expenses",
        requiredRole: "super_admin",
        userRole: req.user.role,
      });
    }

    // NEW: Log the deletion if it's a paid expense (only super_admin can reach here)
    if (expense.paymentStatus === "paid") {
      // Create audit log for deleted paid expense
      await ExpenseAuditLog.create({
    expenseId: expense._id,
    eventId: expense.eventId,
    deletedBy: req.user._id,
    deletedByRole: req.user.role,
    expenseData: {
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      vendor: expense.vendor,
      paymentStatus: expense.paymentStatus,
      paymentDate: expense.paymentDate,
      dueDate: expense.dueDate,
      notes: expense.notes,
      receiptUrl: expense.receiptUrl,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt,
    },
    reason: "Paid expense deleted by super administrator",
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: {
      budgetRemainingBefore: budgetStatus.remainingBudget,
      budgetRemainingAfter: budgetStatus.remainingBudget + expense.amount,
      eventStatus: event.status,
    }
  });
    }

    // Final deletion
    const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
    const updatedBudgetStatus = await getBudgetStatus(expense.eventId);

    res.json({
      message: "Expense deleted successfully",
      budgetStatus: updatedBudgetStatus,
      deletedExpense: {
        _id: deletedExpense._id,
        amount: deletedExpense.amount,
        category: deletedExpense.category,
        description: deletedExpense.description,
        date: deletedExpense.createdAt,
        wasPaid: deletedExpense.paymentStatus === "paid"
      },
      newRemaining: updatedBudgetStatus.remainingBudget,
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

// get budget status for all events
const getBudgetStatusForAllEvents = async (req, res) => {
  try {
    // 1. Get all events with their basic info
    const events = await Event.find().select("_id name");

    // 2. Get all budgets
    const budgets = await Budget.find().select("eventId totalBudget");

    // 3. Get all expenses grouped by event
    const expensesByEvent = await Expense.aggregate([
      {
        $group: {
          _id: "$eventId",
          totalExpenses: { $sum: "$amount" },
        },
      },
    ]);

    // 4. Create response with accurate budget data
    const response = events.map((event) => {
      const eventBudget = budgets.find(
        (b) => b.eventId.toString() === event._id.toString()
      );
      const eventExpense = expensesByEvent.find(
        (e) => e._id.toString() === event._id.toString()
      );

      const totalBudget = eventBudget?.totalBudget || 0;
      const totalExpenses = eventExpense?.totalExpenses || 0;

      return {
        eventId: event._id,
        eventName: event.name,
        budgetStatus: {
          totalBudget,
          totalExpenses,
          remainingBudget: totalBudget - totalExpenses,
        },
      };
    });

    res.json(response);
  } catch (err) {
    res.status(500).json({
      message: "Failed to get budget status",
      error: err.message,
    });
  }
};


// get deleted paid expenses log
const getDeletedPaidExpensesLog = async (req, res) => {
  try {
    const logs = await ExpenseAuditLog.find({
      "expenseData.paymentStatus": "paid"
    })
      .populate("eventId", "name")
      .populate("expenseData.vendor", "name services")
      .populate("expenseData.createdBy", "firstName lastName email")
      .populate("deletedBy", "firstName lastName email role")
      .sort({ createdAt: -1 });

    // Format for frontend
    const formattedLogs = logs.map(log => ({
      _id: log._id,
      expenseId: log.expenseId,
      event: {
        _id: log.eventId._id,
        name: log.eventId.name
      },
      expenseData: {
        amount: log.expenseData.amount,
        description: log.expenseData.description,
        category: log.expenseData.category,
        vendor: log.expenseData.vendor,
        paymentStatus: log.expenseData.paymentStatus,
        paymentDate: log.expenseData.paymentDate,
        createdAt: log.expenseData.createdAt,
        createdBy: log.expenseData.createdBy
      },
      deletedBy: {
        _id: log.deletedBy._id,
        name: `${log.deletedBy.firstName} ${log.deletedBy.lastName}`,
        email: log.deletedBy.email,
        role: log.deletedBy.role
      },
      deletedAt: log.createdAt,
      reason: log.reason,
      metadata: log.metadata
    }));

    res.json({
      deletedPaidExpenses: formattedLogs,
      count: formattedLogs.length
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch deleted expenses log",
      error: err.message
    });
  }
};



module.exports = {
  createExpense,
  getExpensesByEventId,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesSummary,
  getAllExpenses,
  getBudgetStatusForAllEvents,
};
