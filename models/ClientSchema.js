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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
