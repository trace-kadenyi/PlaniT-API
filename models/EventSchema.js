const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    date: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
