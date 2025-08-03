const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    contact: {
      email: String,
      phone: String,
    },
    preferences: String,
    notes: String,
    company: {
      type: String,
      default: "Individual",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
