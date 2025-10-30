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

// Get all tasks
router.get("/", authController.protect, getAllTasks);

// Create a new task
router.post("/", authController.protect, createTask);

// Update a task by ID
router.put("/:id", authController.protect, updateTask);

// Get task by id
router.get("/:id", authController.protect, getTaskById);

// Delete a task by ID
router.delete("/:id", authController.protect, deleteTask);

module.exports = router;
