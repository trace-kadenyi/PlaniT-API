const express = require("express");
const router = express.Router();
const { protect } = require("../controllers/authController");
const { authorize } = require("../middleware/authMiddleware");
const { PERMISSIONS, RESOURCES } = require("../services/permissionService");

const {
  addUserToOrganization,
  getOrganizationUsers,
  removeUserFromOrganization,
  updateUserRole,
  getOrganizationDetails,
} = require("../controllers/organizationController");

// All routes protected
router.use(protect);

// create new user
router.post(
  "/users",
  authorize(PERMISSIONS.MANAGE_USERS, RESOURCES.USER),
  addUserToOrganization,
);

// get all users within an org
router.get(
  "/users",
  authorize(PERMISSIONS.VIEW, RESOURCES.USER),
  getOrganizationUsers,
);

// delete/remove a user from org
router.delete(
  "/users/:userId",
  authorize(PERMISSIONS.MANAGE_USERS, RESOURCES.USER),
  removeUserFromOrganization,
);

// update the role of a user within org
router.patch(
  "/users/:userId/role",
  authorize(PERMISSIONS.MANAGE_USERS, RESOURCES.USER),
  updateUserRole,
);

// get org details
router.get(
  "/",
  authorize(PERMISSIONS.VIEW, RESOURCES.USER),
  getOrganizationDetails,
);

module.exports = router;
