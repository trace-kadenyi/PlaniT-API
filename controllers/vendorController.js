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

// Get all vendors
const getAllVendors = async (req, res) => {
  try {
    const { service, archived } = req.query;
    const filter = {};

    if (service) {
      filter.services = service;
    }
    if (archived !== undefined) {
      filter.isArchived = archived === 'true';
    }

    const vendors = await Vendor.find(filter).sort({ name: 1 });
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get vendor by ID
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

