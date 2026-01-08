const mongoose = require("mongoose");

const Event = require("../models/EventSchema");
const Expense = require("../models/ExpenseSchema");
const Budget = require("../models/BudgetSchema");
const { getBudgetStatus } = require("../utils/budgetHelpers");

const MAX_DESCRIPTION = 150;
const MAX_NOTES = 200;

// ============ HELPER: Filter active expenses ============
const filterActiveExpenses = (expenses) => {
  return expenses.filter((expense) => !expense.isVoided);
};

// ============ HELPER: Calculate active totals ============
const calculateActiveTotals = (expenses) => {
  const activeExpenses = filterActiveExpenses(expenses);
  const totalAmount = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const paidAmount = activeExpenses
    .filter((exp) => exp.paymentStatus === "paid")
    .reduce((sum, exp) => sum + exp.amount, 0);

  return { totalAmount, paidAmount, activeCount: activeExpenses.length };
};

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
// const getAllExpenses = async (req, res) => {
//   try {
//     const expenses = await Expense.find();
//     res.json(expenses);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

const getAllExpenses = async (req, res) => {
  try {
    const canSeeVoided =
      req.user.role === "admin" || req.user.role === "super_admin";
    const showVoided = req.query.showVoided === "true";

    // Build filter
    const filter = {};
    if (!(canSeeVoided && showVoided)) {
      filter.$or = [
        { isVoided: false },
        { isVoided: { $exists: false } }, // ← ADD THIS TOO
      ];
    }

    const expenses = await Expense.find(filter)
      .populate("createdBy", "firstName lastName")
      .populate("voidedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json({
      expenses,
      meta: {
        total: expenses.length,
        includeVoided: canSeeVoided && showVoided,
        canViewVoided: canSeeVoided,
        activeCount: expenses.filter((e) => !e.isVoided).length,
        voidedCount: expenses.filter((e) => e.isVoided).length,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all expenses for an event
// const getExpensesByEventId = async (req, res) => {
//   try {
//     const expenses = await Expense.find({ eventId: req.params.eventId })
//       .populate("vendor", "name services isArchived")
//       .populate("createdBy", "firstName lastName email")
//       .populate("updatedBy", "firstName lastName email")
//       .sort({ createdAt: -1 });

//     const budgetStatus = await getBudgetStatus(req.params.eventId);

//     // Always return success with empty array if no expenses exist
//     res.json({
//       expenses: expenses || [],
//       budgetStatus,
//     });
//   } catch (err) {
//     // Return empty state instead of error
//     res.json({
//       expenses: [],
//       budgetStatus: {
//         totalBudget: 0,
//         totalExpenses: 0,
//         remainingBudget: 0,
//         budgetExists: false,
//       },
//     });
//   }
// };

const getExpensesByEventId = async (req, res) => {
  try {
    // Determine if user can see voided expenses
    const canSeeVoided =
      req.user.role === "admin" || req.user.role === "super_admin";
    const showVoided = req.query.showVoided === "true";

    // Build filter
    const filter = { eventId: req.params.eventId };

    if (!(canSeeVoided && showVoided)) {
      // Show expenses that are NOT voided OR don't have isVoided field
      filter.$or = [
        { isVoided: false },
        { isVoided: { $exists: false } }, // ← CRITICAL: Include expenses without isVoided field
      ];
    }

    const expenses = await Expense.find(filter)
      .populate("vendor", "name services isArchived")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .populate("voidedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const budgetStatus = await getBudgetStatus(req.params.eventId);

    // Calculate totals from ACTIVE expenses only (for budget purposes)
    const activeExpenses = expenses.filter((exp) => !exp.isVoided);
    const totals = {
      totalAmount: activeExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      paidAmount: activeExpenses
        .filter((exp) => exp.paymentStatus === "paid")
        .reduce((sum, exp) => sum + exp.amount, 0),
      activeCount: activeExpenses.length,
      voidedCount: expenses.filter((exp) => exp.isVoided).length,
    };

    res.json({
      expenses: expenses || [],
      budgetStatus,
      totals,
      permissions: {
        canViewVoided: canSeeVoided,
        includeVoided: canSeeVoided && showVoided,
        canVoidExpenses:
          req.user.role === "admin" || req.user.role === "super_admin",
        canUnvoidExpenses: req.user.role === "super_admin",
      },
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
      totals: {
        totalAmount: 0,
        paidAmount: 0,
        activeCount: 0,
        voidedCount: 0,
      },
      permissions: {
        canViewVoided:
          req.user.role === "admin" || req.user.role === "super_admin",
        includeVoided: false,
      },
    });
  }
};
const getVoidedExpenses = async (req, res) => {
  try {
    // Check user role - only admins can see this dedicated view
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        message: "Only Admins and Super Admins can view voided expenses",
      });
    }

    // Optional event filter
    const eventId = req.query.eventId;
    const filter = { isVoided: true };
    if (eventId) filter.eventId = eventId;

    const expenses = await Expense.find(filter)
      .populate("vendor", "name services")
      .populate("createdBy", "firstName lastName email")
      .populate("voidedBy", "firstName lastName email")
      .sort({ voidedAt: -1 });

    // Group by void reason for analysis
    const voidReasons = expenses.reduce((acc, expense) => {
      const reason = expense.voidReason || "No reason provided";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    res.json({
      expenses: expenses || [],
      summary: {
        count: expenses.length,
        totalVoidedAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
        voidReasons: voidReasons,
        paidCount: expenses.filter((exp) => exp.paymentStatus === "paid")
          .length,
        pendingCount: expenses.filter((exp) => exp.paymentStatus === "pending")
          .length,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get expense by ID
// const getExpenseById = async (req, res) => {
//   try {
//     const expense = await Expense.findById(req.params.id)
//       .populate("vendor", "name services")
//       .populate("createdBy", "firstName lastName email")
//       .populate("updatedBy", "firstName lastName email");

//     if (!expense) {
//       return res.status(404).json({ message: "Expense not found" });
//     }
//     res.json(expense);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("vendor", "name services")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .populate("voidedBy", "firstName lastName email");

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // If expense is voided, check if user has permission to see it
    if (expense.isVoided) {
      const canSeeVoided =
        req.user.role === "admin" || req.user.role === "super_admin";
      if (!canSeeVoided) {
        return res.status(404).json({
          message: "Expense not found",
          hint: "This expense may have been voided. Only admins can view voided expenses.",
        });
      }
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
    const updateData = {
      ...req.body,
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

    // Payment status check
    if (expense.paymentStatus === "paid") {
      return res.status(400).json({
        message:
          "For transparency, this expense cannot be deleted because it has already been paid and deducted from the budget.",
        actionRequired: "Create a compensating expense instead",
        contact: "accounting@example.com",
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

// ============ VOID EXPENSE ============
const voidExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Check if already voided
    if (expense.isVoided) {
      return res.status(400).json({
        message: "Expense is already voided",
        voidedAt: expense.voidedAt,
        voidedBy: expense.voidedBy,
      });
    }

    const userRole = req.user.role;
    const isPaid = expense.paymentStatus === "paid";
    const reason = req.body.reason?.trim() || "No reason provided";

    // ============ PERMISSION CHECKS ============

    // 1. PAID EXPENSES: Super Admin only
    if (isPaid && userRole !== "super_admin") {
      return res.status(403).json({
        message: "Only Super Admins can void paid expenses",
        requiredRole: "super_admin",
        currentRole: userRole,
        suggestion: "Contact a super admin for assistance",
      });
    }

    // 2. PENDING EXPENSES: Admin+ only
    if (!isPaid && userRole !== "admin" && userRole !== "super_admin") {
      return res.status(403).json({
        message: "Only Admins and Super Admins can void expenses",
        requiredRole: "admin",
        currentRole: userRole,
      });
    }

    // 3. Reason required for paid expense voiding
    if (isPaid && (!req.body.reason || req.body.reason.trim().length < 10)) {
      return res.status(400).json({
        message:
          "Reason required for voiding paid expenses (minimum 10 characters)",
        field: "reason",
        currentLength: req.body.reason?.length || 0,
      });
    }

    // Prepare void data
    const voidData = {
      isVoided: true,
      voidedBy: req.user._id,
      voidedAt: new Date(),
      voidReason: reason,
      // Add void notice to notes
      notes: expense.notes
        ? `${expense.notes}\n\n--- VOIDED ---\nVoided by: ${
            req.user.firstName
          } ${
            req.user.lastName
          }\nDate: ${new Date().toLocaleString()}\nReason: ${reason}`
        : `--- VOIDED ---\nVoided by: ${req.user.firstName} ${
            req.user.lastName
          }\nDate: ${new Date().toLocaleString()}\nReason: ${reason}`,
    };

    // Update expense with void data
    const voidedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      voidData,
      { new: true }
    )
      .populate("vendor", "name services")
      .populate("createdBy", "firstName lastName email")
      .populate("voidedBy", "firstName lastName email");

    // Log critical void operations
    if (isPaid) {
      console.warn(`CRITICAL: Paid expense voided`, {
        expenseId: expense._id,
        amount: expense.amount,
        category: expense.category,
        voidedBy: req.user._id,
        voidedAt: new Date().toISOString(),
        reason: reason,
        userRole: userRole,
      });
    }

    const updatedBudgetStatus = await getBudgetStatus(expense.eventId);

    res.json({
      message: "Expense voided successfully",
      expense: voidedExpense,
      budgetStatus: updatedBudgetStatus,
      note: "Voided expenses remain in the system for audit purposes",
      warning: isPaid
        ? "Paid expense voiding has been logged for financial audit"
        : undefined,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to void expense",
      systemMessage: err.message,
      errorCode: "EXPENSE_VOID_FAILED",
    });
  }
};

// ============ UNVOID EXPENSE (super admin only) ============
const unvoidExpense = async (req, res) => {
  try {
    // Super admin only
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        message: "Only Super Admins can unvoid expenses",
      });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (!expense.isVoided) {
      return res.status(400).json({ message: "Expense is not voided" });
    }

    // Unvoid the expense
    const unvoidData = {
      isVoided: false,
      voidedBy: null,
      voidedAt: null,
      voidReason: null,
      // Add unvoid notice to notes
      notes: expense.notes
        ? `${expense.notes}\n\n--- UNVOIDED ---\nUnvoided by: ${
            req.user.firstName
          } ${
            req.user.lastName
          }\nDate: ${new Date().toLocaleString()}\nReason: ${
            req.body.reason || "No reason provided"
          }`
        : `--- UNVOIDED ---\nUnvoided by: ${req.user.firstName} ${
            req.user.lastName
          }\nDate: ${new Date().toLocaleString()}\nReason: ${
            req.body.reason || "No reason provided"
          }`,
    };

    const unvoidedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      unvoidData,
      { new: true }
    )
      .populate("vendor", "name services")
      .populate("createdBy", "firstName lastName email");

    console.warn(`CRITICAL: Expense unvoided by Super Admin`, {
      expenseId: expense._id,
      amount: expense.amount,
      unvoidedBy: req.user._id,
      unvoidedAt: new Date().toISOString(),
    });

    res.json({
      message: "Expense unvoided successfully",
      expense: unvoidedExpense,
      budgetStatus: await getBudgetStatus(expense.eventId),
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
  getAllExpenses,
  getBudgetStatusForAllEvents,
  voidExpense,
  unvoidExpense,
  getVoidedExpenses,
};
