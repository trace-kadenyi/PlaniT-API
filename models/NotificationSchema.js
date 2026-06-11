const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      // Current: task:assigned
      // Future: task:status_changed, event:created, user:added, etc.
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      // Stores context depending on type:
      // task:assigned → { taskId, taskTitle, assignedBy }
      // event:created → { eventId, eventName } etc.
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
