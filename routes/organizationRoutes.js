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

router.post("/users", addUserToOrganization);
router.get("/users", getOrganizationUsers);
router.delete("/users/:userId", removeUserFromOrganization);
router.patch("/users/:userId/role", updateUserRole);

module.exports = router;
