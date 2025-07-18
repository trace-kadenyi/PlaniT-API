const express = require("express");
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

// Get all tasks
router.get("/", getAllTasks);

// Create a new task
router.post("/", createTask);

// Update a task by ID
router.put("/:id", updateTask);

// Delete a task by ID
router.delete("/:id", deleteTask);

module.exports = router;
