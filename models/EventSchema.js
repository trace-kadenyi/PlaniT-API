const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxlength: [70, "Event name must be 70 characters or fewer"],
      required: [true, "Event name is required"],
    },
    description: {
      type: String,
      maxlength: [300, "Description must be 300 characters or fewer"],
      required: [true, "Description is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    location: {
      venue: {
        type: String,
        required: [true, "Venue is required"],
      },
      address: String,
      city: {
        type: String,
        required: [true, "City is required"],
      },
      country: {
        type: String,
        required: [true, "Country is required"],
      },
    },
    status: {
      type: String,
      enum: ["Planning", "In Progress", "Completed", "Cancelled"],
      default: "Planning",
    },
    type: {
      type: String,
      required: [true, "Type of Event is required"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
