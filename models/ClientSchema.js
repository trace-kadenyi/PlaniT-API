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
    preferences: {
      type: String,
      maxlength: [150, "Description must be 150 characters or fewer"],
    },
    notes: {
      type: String,
      maxlength: [200, "Description must be 200 characters or fewer"],
    },
    company: {
      type: String,
      default: "Individual",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
