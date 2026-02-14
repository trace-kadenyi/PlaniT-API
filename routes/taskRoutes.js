const express = require("express");
const router = express.Router();

const {
  getAllTasks,
  createTask,
  updateTask,
  getTaskById,
  deleteTask,
} = require("../controllers/taskController");
const authController = require("../controllers/authController");
const { authorize } = require("../middleware/authmiddleware");
const { PERMISSIONS, RESOURCES } = require("../services/permissionService");

// 🔐 Protect all task routes
router.use(authController.protect);

// Get all tasks
router.get("/", authorize(PERMISSIONS.VIEW, RESOURCES.TASK), getAllTasks);

// Create a new task
router.post("/", authorize(PERMISSIONS.CREATE, RESOURCES.TASK), createTask);

// Get task by id
router.get("/:id", authorize(PERMISSIONS.VIEW, RESOURCES.TASK), getTaskById);

// Update a task by ID
router.put("/:id", authorize(PERMISSIONS.EDIT, RESOURCES.TASK), updateTask);

// Delete a task by ID
router.delete(
  "/:id",
  authorize(PERMISSIONS.DELETE, RESOURCES.TASK),
  deleteTask,
);

module.exports = router;
