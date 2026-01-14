const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },

    // Original planned budget
    totalBudget: {
      type: Number,
      required: true,
      min: 0,
    },

    // Money that has ACTUALLY been paid (irreversible)
    spentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Money reserved by unpaid expenses
    reservedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // deleted paid expenses
    deletedPaidTotal: {
      type: Number,
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [300, "Notes must be 300 characters or fewer"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔹 Derived values (never stored directly)
budgetSchema.virtual("remainingBudget").get(function () {
  return this.totalBudget - this.spentAmount - this.reservedAmount;
});

budgetSchema.virtual("availableBudget").get(function () {
  // alias, useful semantically
  return this.remainingBudget;
});

module.exports = mongoose.model("Budget", budgetSchema);
