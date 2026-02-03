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

    const vendorData = {
      ...req.body,
      organizationId: req.user.organization,
      createdBy: req.user._id,
    };

    const vendor = await Vendor.create(vendorData);

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

    // filter by org
    const filter = {
      organizationId: req.user.organization,
      isDeleted: false,
    };

    if (service) {
      filter.services = service;
    }
    if (archived !== undefined) {
      filter.isArchived = archived === "true";
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
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      organizationId: req.user.organization,
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    const vendorData = vendor.toObject();
    if (vendor.isDeleted) {
      vendorData.name = `${vendor.name} (Deleted)`;
    }

    res.json(vendorData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update vendor
const updateVendor = async (req, res) => {
  try {
    // Check notes length if provided in update
    if (req.body.notes && req.body.notes.length > MAX_NOTES) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Notes cannot exceed ${MAX_NOTES} characters`,
        field: "notes",
        maxLength: MAX_NOTES,
        currentLength: req.body.notes.length,
      });
    }

    const updatedVendor = await Vendor.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organization,
        isDeleted: false,
      },
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json(updatedVendor);
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

// Archive/unarchive vendor
const toggleVendorArchive = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      organizationId: req.user.organization,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    vendor.isArchived = !vendor.isArchived;
    await vendor.save();

    res.json({
      message: `Vendor ${
        vendor.isArchived ? "archived" : "unarchived"
      } successfully`,
      vendor,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get vendor statistics
const getVendorStats = async (req, res) => {
  try {
    const stats = await Vendor.aggregate([
      {
        $match: {
          organizationId: req.user.organization,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$services",
          count: { $sum: 1 },
          archived: { $sum: { $cond: [{ $eq: ["$isArchived", true] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete vendor completely
// const deleteVendor = async (req, res) => {
//   try {
//     const vendor = await Vendor.findOneAndDelete({
//       _id: req.params.id,
//       organizationId: req.user.organization,
//     });

//     if (!vendor) {
//       return res.status(404).json({ error: "Vendor not found" });
//     }

//     res.json({
//       message: "Vendor deleted successfully",
//       deletedVendor: vendor,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organization,
        isDeleted: false,
      },
      {
        isDeleted: true,
        isArchived: true,
        deletedAt: new Date(),
      },
      { new: true },
    );

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json({
      message: "Vendor deleted successfully",
      deletedVendor: {
        _id: vendor._id,
        name: `${vendor.name} (Deleted)`,
        isDeleted: true,
        deletedAt: vendor.deletedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete all vendors completely
const deleteAllVendors = async (req, res) => {
  try {
    // Delete all vendors
    const deletedVendors = await Vendor.deleteMany({
      organizationId: req.user.organization,
    });

    res.json({
      message: "All vendors deleted successfully",
      deletedCount: deletedVendors.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  toggleVendorArchive,
  getVendorStats,
  deleteVendor,
  deleteAllVendors,
};
