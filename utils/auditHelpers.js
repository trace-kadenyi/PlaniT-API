const Expense = require("../models/ExpenseSchema");
const ExpenseAuditLog = require("../models/ExpenseAuditLogSchema");

// ============= PERMISSION LOG HELPERS =============
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

    const expenseObj = expense.toObject?.() ?? expense;

    const createdBySnapshot = expenseObj.createdBySnapshot ?? {
      _id: expenseObj.createdBy?._id ?? expenseObj.createdBy,
      firstName: expenseObj.createdBy?.firstName,
      lastName: expenseObj.createdBy?.lastName,
      email: expenseObj.createdBy?.email,
      role: expenseObj.createdBy?.role,
    };

    const logData = {
      expenseId: expense._id,
      eventId: expense.eventId,
      organizationId: user.organization,
      actionType,
      performedBy: user._id,
      performedBySnapshot: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      createdBy: expenseObj.createdBy?._id ?? expenseObj.createdBy,
      createdBySnapshot,

      changes,
      reason,
      description,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      isAmountChange: changes.some((c) => c.field === "amount"),
      isPaymentStatusChange: changes.some((c) => c.field === "paymentStatus"),
      isVendorChange: changes.some((c) => c.field === "vendor"),
    };

    if (previousExpense) {
      logData.previousData = previousExpense.toObject?.() ?? previousExpense;
    }

    if (actionType !== "DELETE") {
      logData.newData = {
        ...expenseObj,
        createdBySnapshot: expenseObj.createdBySnapshot ?? createdBySnapshot,
      };
    } else {
      logData.deletedData = {
        ...expenseObj,
        createdBySnapshot: expenseObj.createdBySnapshot ?? createdBySnapshot,
      };
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

module.exports = {
  canPerformExpenseAction,
  canViewAuditLogs,
  getChangedFields,
  determineActionType,
  logExpenseAction,
};
