const Task = require("../models/TaskSchema");
const Event = require("../models/EventSchema");

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
    // Validate input lengths first
    const taskName = req.body.title || "";
    if (taskName.length > maxNameChars) {
      return res.status(400).json({
        message: `Task name cannot exceed ${maxNameChars} characters.`,
      });
    }

    const description = req.body.description || "";
    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }

    // Validate event exists and get event date
    const event = await Event.findById(req.body.eventId);
    if (!event) {
      return res.status(404).json({ message: "Associated event not found" });
    }

    // Convert dates to consistent format for comparison
    const taskDeadline = new Date(req.body.deadline);
    const eventDate = new Date(event.date);

    // Clear time components for date-only comparison if needed
    taskDeadline.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);



    if (taskDeadline > eventDate) {
      return res.status(400).json({
        message: "Task deadline cannot be after the event date",
        validation: {
          field: "deadline",
          message: "Task deadline must be before the event date",
        },
      });
    }

    if (taskDeadline < new Date()) {
      return res.status(400).json({
        message: "Task deadline cannot be in the past",
        validation: {
          field: "deadline",
          message: "Task deadline must be a date in the future",
        },
      });
    }

    // Only create task if validation passes
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        message: messages.join(", "),
        validationErrors: err.errors,
      });
    }

    res.status(400).json({
      message: err.message || "Something went wrong while creating the task.",
    });
  }
};
// Update a task
const updateTask = async (req, res) => {
  try {
    // name word limit
    const taskName = req.body.title || "";
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

    // Check if task deadline is being updated
    if (req.body.deadline) {
      // Get the current task to find the associated event
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const event = await Event.findById(task.eventId);
      if (!event) {
        return res.status(404).json({ message: "Associated event not found" });
      }

      const newDeadline = new Date(req.body.deadline);
      if (newDeadline > event.date) {
        return res.status(400).json({
          message: "Task deadline cannot be after the event date",
        });
      }
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
