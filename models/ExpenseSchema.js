const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Must be linked to an event"],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Description too long"],
    },
    category: {
      type: String,
      required: true,
      enum: [
        "venue",
        "catering",
        "decorations",
        "equipment",
        "staffing",
        "marketing",
        "other",
      ],
      default: "other",
    },
    vendorName: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentDate: Date,
    dueDate: Date,
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    receiptUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, "Invalid receipt URL"],
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ eventId: 1, category: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
