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
router.delete("/users/:userId", removeUserFromOrganization);
router.patch("/users/:userId/role", updateUserRole);

module.exports = router;
