const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    assignedTo: {
      type: String, // you can change this to a User ObjectId if you add user support
    },
    deadline: Date,
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "In Review", "Completed"],
      default: "To Do",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
