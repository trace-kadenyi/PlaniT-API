const mongoose = require("mongoose");

const expenseAuditLogSchema = new mongoose.Schema(
  {
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
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedByRole: {
      type: String,
      enum: ["super_admin", "admin", "planner", "viewer"],
      required: true,
    },
    expenseData: {
      // Store the complete expense data at time of deletion
      amount: Number,
      description: String,
      category: String,
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },
      paymentStatus: {
        type: String,
        enum: ["pending", "paid"],
      },
      paymentDate: Date,
      dueDate: Date,
      notes: String,
      receiptUrl: String,
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: Date,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    ipAddress: String,
    userAgent: String,
    metadata: {
      // Additional context if needed
      budgetRemainingBefore: Number,
      budgetRemainingAfter: Number,
      eventStatus: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
expenseAuditLogSchema.index({ expenseId: 1 });
expenseAuditLogSchema.index({ eventId: 1 });
expenseAuditLogSchema.index({ deletedBy: 1 });
expenseAuditLogSchema.index({ "expenseData.paymentStatus": 1 });
expenseAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ExpenseAuditLog", expenseAuditLogSchema);
