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
      required: [true, "Amount is required"],
      min: 0,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [150, "Description too long"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
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
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
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
      maxlength: 200,
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
