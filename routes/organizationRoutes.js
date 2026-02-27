const express = require("express");
const router = express.Router();

const {
  getOrganizationDetails,
  updateOrganization,
} = require("../controllers/organizationController");
const authController = require("../controllers/authController");
const { authorize } = require("../middleware/authmiddleware");
const { PERMISSIONS, RESOURCES } = require("../services/permissionService");

// 🔐 Protect all routes
router.use(authController.protect);

// get org details
router.get(
  "/",
  authorize(PERMISSIONS.VIEW, RESOURCES.ORGANIZATION),
  getOrganizationDetails,
);

// PATCH route - Super Admin only
router.patch(
  "/",
  authorize(PERMISSIONS.EDIT, RESOURCES.ORGANIZATION),
  updateOrganization,
);

module.exports = router;
