const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    date: Date,
    location: {
      venue: String,
      address: String,
      city: String,
      country: String,
    },
    status: {
      type: String,
      enum: ["Planning", "In Progress", "Completed", "Cancelled"],
      default: "Planning",
    },
    type: String, // e.g., "Wedding", "Corporate", etc. (helps with filtering)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
