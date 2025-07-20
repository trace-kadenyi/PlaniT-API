const Task = require("../models/TaskSchema");

const maxChars = 150;
const maxNameChars = 50;
// Get all tasks
const getAllTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.eventId) {
      filter.eventId = req.query.eventId;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new task
const createTask = async (req, res) => {
  try {
    // name word limit
    const taskName = req.body.name || "";
    if (taskName.length > maxNameChars) {
      return res.status(400).json({
        message: `Task name cannot exceed ${maxNameChars} characters.`,
      });
    }

    // description word limit
    const description = req.body.description || "";
    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    // General error fallback
    res.status(400).json({
      message: err.message || "Something went wrong while creating the task.",
    });
  }
};

// Update a task
const updateTask = async (req, res) => {
  try {
    // name word limit
    const taskName = req.body.name || "";
    if (taskName.length > maxNameChars) {
      return res.status(400).json({
        message: `Task name cannot exceed ${maxNameChars} characters.`,
      });
    }

    // description word limit
    const description = req.body.description || "";
    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get a single task by ID
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    // General error fallback
    res.status(400).json({
      message: err.message || "Something went wrong while updating the task.",
    });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  getTaskById,
  deleteTask,
};
