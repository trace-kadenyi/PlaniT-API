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

// // create new user
// router.post(
//   "/users",
//   authorize(PERMISSIONS.MANAGE_USERS, RESOURCES.USER),
//   addUserToOrganization,
// );

// // get all users within an org
// router.get(
//   "/users",
//   authorize(PERMISSIONS.VIEW, RESOURCES.USER),
//   getOrganizationUsers,
// );

// // delete/remove a user from org
// router.delete(
//   "/users/:id",
//   authorize(PERMISSIONS.MANAGE_USERS, RESOURCES.USER),
//   removeUserFromOrganization,
// );

// // update the role of a user within org
// router.patch(
//   "/users/:id/role",
//   authorize(PERMISSIONS.MANAGE_USERS, RESOURCES.USER),
//   updateUserRole,
// );

// get org details
router.get(
  "/",
  authorize(PERMISSIONS.VIEW, RESOURCES.ORGANIZATION),
  getOrganizationDetails,
);

module.exports = router;
