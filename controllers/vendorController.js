const mongoose = require("mongoose");
const Vendor = require("../models/VendorSchema");

const MAX_NOTES = 200;

// Create new vendor
const createVendor = async (req, res) => {
  try {
    // Check notes length if provided
    if (req.body.notes && req.body.notes.length > MAX_NOTES) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Vendor notes cannot exceed ${MAX_NOTES} characters`,
        field: "notes",
        maxLength: MAX_NOTES,
        currentLength: req.body.notes.length,
      });
    }

    const vendor = new Vendor(req.body);
    await vendor.save();

    res.status(201).json(vendor);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(err.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }
    res.status(500).json({ message: err.message });
  }
};

