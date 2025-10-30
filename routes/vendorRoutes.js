const express = require("express");
const router = express.Router();

const {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  toggleVendorArchive,
  getVendorStats,
  deleteVendor,
  deleteAllVendors,
} = require("../controllers/vendorController");
const authController = require("../controllers/authController");

// Create vendor
router.post("/", authController.protect, createVendor);

// Get all vendors
router.get("/", authController.protect, getAllVendors);

// Get vendor stats
router.get("/stats", authController.protect, getVendorStats);

// Get single vendor
router.get("/:id", authController.protect, getVendorById);

// Update vendor
router.put("/:id", authController.protect, updateVendor);

// Archive/unarchive vendor
router.patch("/:id/archive", authController.protect, toggleVendorArchive);

// DELETE /api/vendor/id
router.delete("/:id", authController.protect, deleteVendor);

// DELETE /api/vendors
router.delete("/", authController.protect, deleteAllVendors);

module.exports = router;
