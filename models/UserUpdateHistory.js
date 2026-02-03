const mongoose = require("mongoose");

const userUpdateHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedByRole: {
      type: String,
      enum: ["super_admin", "admin", "planner", "viewer"],
      required: true,
    },
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],
    type: {
      type: String,
      enum: [
        "profile_update",
        "password_change",
        "role_change",
        "deactivation",
        "reactivation",
      ],
      default: "profile_update",
    },
    description: String,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
userUpdateHistorySchema.index({ userId: 1, createdAt: -1 });
userUpdateHistorySchema.index({ updatedBy: 1 });

module.exports = mongoose.model("UserUpdateHistory", userUpdateHistorySchema);
