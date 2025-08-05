const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    services: {
      type: String,
      enum: [
        "venue",
        "catering",
        "decorations",
        "equipment",
        "staffing",
        "marketing",
        "other",
      ],
      required: true,
    },
    contact: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    address: String,
    notes: {
      type: String,
      maxlength: [200, "Description must be 200 characters or fewer"],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vendor", vendorSchema);
