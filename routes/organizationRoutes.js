const express = require("express");
const router = express.Router();

const {
  addUserToOrganization,
  getOrganizationUsers,
  removeUserFromOrganization,
  updateUserRole,
  getOrganizationDetails,
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

module.exports = router;
