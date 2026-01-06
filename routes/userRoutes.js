// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  getUserUpdateHistory,
} = require("../controllers/userController");
const { protect } = require("../controllers/authController");

// All routes require authentication
router.use(protect);

// Get all users in organization
router.get("/", getUsers);

// Get single user
router.get("/:userId", getUser);

// Get user's update history
router.get("/:userId/history", getUserUpdateHistory);

// Add new user
router.post("/", createUser);

// Update user details
router.patch("/:userId", updateUser);

// Update user role
router.patch("/:userId/role", updateUserRole);

// Delete user
router.delete("/:userId", deleteUser);

module.exports = router;
