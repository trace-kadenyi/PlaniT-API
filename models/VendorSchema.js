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
        "venue", // Location rental
        "catering", // Food, drinks, cake
        "decorations", // Design, florals, signage
        "equipment", // Rentals: tents, furniture, A/V
        "staffing", // Wait staff, ushers, cleaners
        "entertainment", // DJs, MCs, performers
        "transportation", // Guest or vendor transport
        "marketing", // Invites, digital promo, posters
        "photography/videography", // photos, videos
        "other", // Any unique/unclassified vendors
      ],
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vendor", vendorSchema);
