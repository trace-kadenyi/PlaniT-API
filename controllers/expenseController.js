const mongoose = require("mongoose");

const Event = require("../models/EventSchema");
const Expense = require("../models/ExpenseSchema");
const Budget = require("../models/BudgetSchema");
const ExpenseAuditLog = require("../models/ExpenseAuditLogSchema");
const { getBudgetStatus } = require("../utils/budgetHelpers");

const MAX_DESCRIPTION = 150;
const MAX_NOTES = 200;

// ============= PERMISSION HELPERS =============
const canPerformExpenseAction = (user, expense, action) => {
  if (action === "view") return true;
  if (user.role === "viewer") return false;

  if (action === "delete" && expense && expense.paymentStatus === "paid") {
    return user.role === "super_admin";
  }

  return ["planner", "admin", "super_admin"].includes(user.role);
};

const canViewAuditLogs = (user) => {
  return ["admin", "super_admin"].includes(user.role);
};

// ============= AUDIT LOG HELPERS =============
const getChangedFields = (oldExpense, newExpense) => {
  const changes = [];
  if (!oldExpense || !newExpense) return changes;

  const fields = [
    "amount",
    "description",
    "category",
    "vendor",
    "paymentStatus",
    "paymentDate",
    "dueDate",
    "notes",
    "receiptUrl",
  ];

  fields.forEach((field) => {
    const oldValue = oldExpense[field];
    const newValue = newExpense[field];

    if (field === "vendor") {
      // Extract IDs from both values for comparison
      const getVendorId = (value) => {
        if (!value) return null;
        if (typeof value === "string") return value;
        if (value._id) return value._id.toString();
        if (value.toString) return value.toString();
        return null;
      };

      const oldVendorId = getVendorId(oldValue);
      const newVendorId = getVendorId(newValue);

      if (oldVendorId !== newVendorId) {
        changes.push({
          field,
          oldValue: oldVendorId,
          newValue: newVendorId,
        });
      }
    } else if (field === "paymentDate" || field === "dueDate") {
      // Handle date comparisons properly
      const oldDate = oldValue ? new Date(oldValue).toISOString() : null;
      const newDate = newValue ? new Date(newValue).toISOString() : null;

      if (oldDate !== newDate) {
        changes.push({
          field,
          oldValue: oldValue ? new Date(oldValue).toISOString() : null,
          newValue: newValue ? new Date(newValue).toISOString() : null,
        });
      }
    } else if (oldValue !== newValue) {
      changes.push({ field, oldValue, newValue });
    }
  });

  return changes;
};

const determineActionType = (changes, isCreate, isDelete) => {
  if (isCreate) return "CREATE";
  if (isDelete) return "DELETE";
  if (changes.find((c) => c.field === "amount")) return "AMOUNT_CHANGE";
  if (changes.find((c) => c.field === "paymentStatus")) return "STATUS_CHANGE";
  return "UPDATE";
};

const logExpenseAction = async ({
  actionType,
  expense,
  previousExpense = null,
  user,
  reason = "",
  description = "",
  budgetStatusBefore,
  budgetStatusAfter,
  req,
}) => {
  try {
    const changes = previousExpense
      ? getChangedFields(previousExpense, expense)
      : [];

    const logData = {
      expenseId: expense._id,
      eventId: expense.eventId,
      actionType,
      performedBy: user._id,
      performedByRole: user.role,
      changes,
      reason,
      description,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      isAmountChange: changes.some((c) => c.field === "amount"),
      isPaymentStatusChange: changes.some((c) => c.field === "paymentStatus"),
      isVendorChange: changes.some((c) => c.field === "vendor"),
    };

    // FIXED: Safe population with null checks
    const safePopulate = async (expenseDoc) => {
      if (!expenseDoc || !expenseDoc._id) return expenseDoc;
      try {
        const populated = await Expense.findById(expenseDoc._id)
          .populate("vendor", "name services")
          .populate("createdBy", "firstName lastName role");
        return populated ? populated.toObject() : expenseDoc;
      } catch (err) {
        console.error("Population error, using original:", err.message);
        return expenseDoc;
      }
    };

    if (previousExpense) {
      const populatedPrev = await safePopulate(previousExpense);
      logData.previousData = populatedPrev || previousExpense;
    }

    if (actionType !== "DELETE") {
      const populatedCurrent = await safePopulate(expense);
      logData.newData = populatedCurrent || expense;
    } else {
      const populatedDeleted = await safePopulate(expense);
      logData.deletedData = populatedDeleted || expense;
    }

    if (budgetStatusBefore || budgetStatusAfter) {
      logData.budgetImpact = {
        before: budgetStatusBefore || {},
        after: budgetStatusAfter || {},
      };
    }

    await ExpenseAuditLog.create(logData);
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};

// ============= CONTROLLER FUNCTIONS =============

// Create new expense
const createExpense = async (req, res) => {
  try {
    // Check if user can create expenses
    if (!canPerformExpenseAction(req.user, null, "create")) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to create expenses",
        requiredRole: ["planner", "admin", "super_admin"],
        userRole: req.user.role,
      });
    }

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

    // NOTE: You said you don't want to log creation yet
    // If you change your mind, uncomment this:
    /*
    await logExpenseAction({
      actionType: "CREATE",
      expense: populatedExpense,
      user: req.user,
      reason: "New expense created",
      description: `Created expense: ${populatedExpense.description} for $${populatedExpense.amount}`,
      budgetStatusBefore: budgetStatus,
      budgetStatusAfter: await getBudgetStatus(req.body.eventId),
      req,
    });
    */

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

    // PREVENT EDITING OF PAID EXPENSES
    if (existingExpense.paymentStatus === "paid") {
      return res.status(400).json({
        error: "CannotEditPaidExpense",
        message: "Paid expenses cannot be edited",
        resolution: "If changes are needed, delete and recreate the expense",
      });
    }

    // Check if user can update this expense
    if (!canPerformExpenseAction(req.user, existingExpense, "update")) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to update expenses",
        requiredRole: ["planner", "admin", "super_admin"],
        userRole: req.user.role,
      });
    }

    // If trying to mark as paid, verify permissions
    if (req.body.paymentStatus === "paid" && req.user.role === "viewer") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Viewers cannot mark expenses as paid",
        requiredRole: ["planner", "admin", "super_admin"],
        userRole: req.user.role,
      });
    }

    // Get budget status BEFORE update for logging
    const budgetStatusBefore = await getBudgetStatus(existingExpense.eventId);

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

    // ALWAYS log the update
    const changes = getChangedFields(existingExpense, updatedExpense);

    await logExpenseAction({
      actionType: determineActionType(changes, false, false),
      expense: updatedExpense,
      previousExpense: existingExpense,
      user: req.user,
      reason: "Expense updated",
      description: `Updated expense: ${updatedExpense.description} (${changes.length} fields changed)`,
      budgetStatusBefore,
      budgetStatusAfter: await getBudgetStatus(existingExpense.eventId),
      req,
    });

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

    const event = await Event.findById(expense.eventId);
    if (!event) {
      return res.status(404).json({ message: "Associated event not found" });
    }

    if (event.status === "Completed") {
      return res.status(400).json({
        message: "Cannot delete expenses for completed events",
        resolution: "Please reopen the event if changes are needed",
      });
    }

    const budgetStatus = await getBudgetStatus(expense.eventId);
    if (!budgetStatus) {
      return res.status(404).json({ message: "Associated budget not found" });
    }

    if (!canPerformExpenseAction(req.user, expense, "delete")) {
      if (expense.paymentStatus === "paid") {
        return res.status(403).json({
          error: "Forbidden",
          message: "Only super administrators can delete paid expenses",
          requiredRole: "super_admin",
          userRole: req.user.role,
        });
      } else {
        return res.status(403).json({
          error: "Forbidden",
          message: "You do not have permission to delete expenses",
          requiredRole: ["planner", "admin", "super_admin"],
          userRole: req.user.role,
        });
      }
    }

    await logExpenseAction({
      actionType: "DELETE",
      expense,
      user: req.user,
      reason:
        expense.paymentStatus === "paid"
          ? "Paid expense deleted by super administrator"
          : "Expense deleted",
      description: `Deleted expense: ${expense.description} (${expense.paymentStatus}, $${expense.amount})`,
      budgetStatusBefore: budgetStatus,
      budgetStatusAfter: await getBudgetStatus(expense.eventId),
      req,
    });

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
        wasPaid: deletedExpense.paymentStatus === "paid",
        deletedBy: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          role: req.user.role,
        },
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

// Get expense audit logs
const getExpenseAuditLogs = async (req, res) => {
  try {
    if (!canViewAuditLogs(req.user)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only administrators can view audit logs",
        requiredRole: ["admin", "super_admin"],
        userRole: req.user.role,
      });
    }

    const {
      eventId,
      actionType,
      startDate,
      endDate,
      limit = 100,
      userId,
    } = req.query;
    let query = {};

    // FIXED: Proper event filtering
    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      query.eventId = eventId;
    }

    if (actionType) query.actionType = actionType;
    if (userId && req.user.role === "super_admin") query.performedBy = userId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // FIXED: Simplified query - populate only what's needed
    const logs = await ExpenseAuditLog.find(query)
      .populate("eventId", "name")
      .populate("performedBy", "firstName lastName email role")
      .populate("expenseId", "description amount category paymentStatus")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // FIXED: Format for frontend compatibility
    const formattedLogs = logs.map((log) => {
      // Determine which data to use
      const expenseData =
        log.actionType === "DELETE"
          ? log.deletedData
          : log.newData || log.previousData || {};

      return {
        _id: log._id,
        expenseId: log.expenseId?._id || log.expenseId,
        expenseData: {
          description: expenseData.description || log.expenseId?.description,
          amount: expenseData.amount || log.expenseId?.amount,
          category: expenseData.category || log.expenseId?.category,
          vendor: expenseData.vendor || log.expenseId?.vendor,
          paymentStatus:
            expenseData.paymentStatus || log.expenseId?.paymentStatus,
          paymentDate: expenseData.paymentDate,
          dueDate: expenseData.dueDate,
          notes: expenseData.notes,
          receiptUrl: expenseData.receiptUrl,
          createdAt: expenseData.createdAt || log.expenseId?.createdAt,
          createdBy: expenseData.createdBy || log.expenseId?.createdBy,
        },
        event: {
          _id: log.eventId?._id || log.eventId,
          name: log.eventId?.name || "Unknown Event",
        },
        deletedBy: {
          _id: log.performedBy?._id,
          name: log.performedBy
            ? `${log.performedBy.firstName} ${log.performedBy.lastName}`
            : "Unknown User",
          email: log.performedBy?.email,
          role: log.performedByRole || log.performedBy?.role,
        },
        deletedAt: log.createdAt,
        reason: log.reason,
        metadata: log.budgetImpact
          ? {
              budgetRemainingBefore: log.budgetImpact.before?.remainingBudget,
              budgetRemainingAfter: log.budgetImpact.after?.remainingBudget,
            }
          : {},
        actionType: log.actionType,
        changes: log.changes || [],
      };
    });

    // FIXED: Return what frontend expects
    res.json({
      deletedPaidExpenses: formattedLogs, // Frontend uses this key
      auditLogs: formattedLogs,
      count: formattedLogs.length,
      filters: { eventId, actionType, startDate, endDate, userId },
      userPermissions: {
        role: req.user.role,
        canViewAll: req.user.role === "super_admin",
      },
    });
  } catch (err) {
    console.error("Audit log error:", err);
    res.status(500).json({
      message: "Failed to fetch expense audit logs",
      error: err.message,
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
  getExpenseAuditLogs,
};
