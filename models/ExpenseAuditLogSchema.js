const mongoose = require("mongoose");

const expenseAuditLogSchema = new mongoose.Schema(
  {
    // Core identifiers
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // Action metadata
    actionType: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "AMOUNT_CHANGE"],
      required: true,
    },

    // User who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedByRole: {
      type: String,
      enum: ["super_admin", "admin", "planner", "viewer"],
      required: true,
    },

    // Track specific changes
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],

    // Data snapshots for context
    previousData: {
      type: mongoose.Schema.Types.Mixed,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
    },

    // For DELETE actions - store complete expense data
    deletedData: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Context and notes
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Budget impact (important for financial tracking)
    budgetImpact: {
      before: {
        totalBudget: Number,
        totalExpenses: Number,
        remainingBudget: Number,
      },
      after: {
        totalBudget: Number,
        totalExpenses: Number,
        remainingBudget: Number,
      },
    },

    // Technical metadata
    ipAddress: String,
    userAgent: String,

    // Flags for quick filtering of high-risk actions
    isAmountChange: Boolean,
    isPaymentStatusChange: Boolean,
    isVendorChange: Boolean,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
);

// Enhanced indexes
expenseAuditLogSchema.index({ expenseId: 1 });
expenseAuditLogSchema.index({ eventId: 1 });
expenseAuditLogSchema.index({ performedBy: 1 });
expenseAuditLogSchema.index({ actionType: 1 });
expenseAuditLogSchema.index({ "changes.field": 1 });
expenseAuditLogSchema.index({ createdAt: -1 });
expenseAuditLogSchema.index({ isAmountChange: 1 });
expenseAuditLogSchema.index({ isPaymentStatusChange: 1 });
expenseAuditLogSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("ExpenseAuditLog", expenseAuditLogSchema);
