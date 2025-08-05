const express = require("express");
const router = express.Router();
const {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  toggleVendorArchive,
  getVendorStats,
} = require("../controllers/vendorController");

// Create vendor
router.post("/", createVendor);

// Get all vendors
router.get("/", getAllVendors);

// Get vendor stats
router.get("/stats", getVendorStats);

// Get single vendor
router.get("/:id", getVendorById);

// Update vendor
router.put("/:id", updateVendor);

// Archive/unarchive vendor
router.patch("/:id/archive", toggleVendorArchive);

module.exports = router;
