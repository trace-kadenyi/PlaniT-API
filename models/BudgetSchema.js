const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Budget must be linked to an event"],
      unique: true,
    },
    totalBudget: {
      type: Number,
      required: true,
      min: [0, "Budget must be 0 or more"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Budget", budgetSchema);
