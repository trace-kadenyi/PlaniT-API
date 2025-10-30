// organizationRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../controllers/authController");
const {
  addUserToOrganization,
  getOrganizationUsers,
  removeUserFromOrganization,
  updateUserRole,
} = require("../controllers/organizationController");

router.use(protect); // All routes protected

// create new user
router.post("/users", addUserToOrganization);

// get all users within an org
router.get("/users", getOrganizationUsers);

// delete/remove a user from org
router.delete("/users/:userId", removeUserFromOrganization);

// update the role of a user within org
router.patch("/users/:userId/role", updateUserRole);

module.exports = router;
