const express = require("express");
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTask,
  getTaskById,
  deleteTask,
} = require("../controllers/taskController");

// Get all tasks
router.get("/", getAllTasks);

// Create a new task
router.post("/", createTask);

// Update a task by ID
router.put("/:id", updateTask);

// Get task by id
router.get("/:id", getTaskById);

// Delete a task by ID
router.delete("/:id", deleteTask);

module.exports = router;
