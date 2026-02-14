const Task = require("../models/TaskSchema");
const Event = require("../models/EventSchema");
const User = require("../models/UserSchema");

const maxChars = 150;
const maxNameChars = 50;

// Get all tasks
const getAllTasks = async (req, res) => {
  try {
    // Get all users in the same organization
    const organizationUsers = await User.find({
      organization: req.user.organization,
    }).select("_id");

    const organizationUserIds = organizationUsers.map((user) => user._id);

    // Base filter - only tasks created by users in same organization
    const filter = {
      createdBy: { $in: organizationUserIds },
    };

    if (req.query.eventId) {
      filter.eventId = req.query.eventId;
    }

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "eventId",
        select: "name date", // Only get name and date
        options: { retainNullValues: true }, // Keep null if eventId is null
      })
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName email isActive")
      .populate("updatedBy", "firstName lastName email isActive");

    // Transform tasks to include eventName at top level
    const tasksWithEventName = tasks.map((task) => ({
      ...task.toObject(),
      eventName: task.eventId?.name || "Unassigned", // Add eventName field
    }));

    res.json(tasksWithEventName);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new task
const createTask = async (req, res) => {
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

    // Validate event exists and get event date
    const event = await Event.findById(req.body.eventId);
    if (!event) {
      return res.status(404).json({ message: "Associated event not found" });
    }

    // 🚫 PREVENT CREATING TASKS FOR ARCHIVED EVENTS
    if (event.isArchived) {
      return res.status(403).json({
        error: "EventArchived",
        message:
          "Cannot create tasks for archived events. Please restore the event first.",
      });
    }

    // verify user has access to this event (event must be in same org)
    const organizationUsers = await User.find({
      organization: req.user.organization,
    }).select("_id");
    const organizationUserIds = organizationUsers.map((user) => user._id);

    // Check if the event was created by someone in the same organization
    const eventCreatorInOrg = await Event.findOne({
      _id: req.body.eventId,
      createdBy: { $in: organizationUserIds },
    });

    if (!eventCreatorInOrg) {
      return res.status(403).json({
        message: "Access denied to this event",
      });
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
    const taskData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const task = new Task(taskData);
    await task.save();

    // Populate the response with user details
    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    res.status(201).json(populatedTask);
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
    // Get all users in the same organization
    const organizationUsers = await User.find({
      organization: req.user.organization,
    }).select("_id");
    const organizationUserIds = organizationUsers.map((user) => user._id);

    // Check if task exists and user has access (any task in the organization)
    const existingTask = await Task.findOne({
      _id: req.params.id,
      createdBy: { $in: organizationUserIds },
    });

    if (!existingTask) {
      return res.status(404).json({
        message: "Task not found or access denied",
      });
    }

    // 🚫 CHECK IF ASSOCIATED EVENT IS ARCHIVED
    if (existingTask.eventId) {
      const event = await Event.findOne({
        _id: existingTask.eventId,
        organizationId: req.user.organization,
      }).select("isArchived");

      if (event && event.isArchived) {
        return res.status(403).json({
          error: "EventArchived",
          message:
            "Cannot update tasks for archived events. Please restore the event first.",
        });
      }
    }

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

      // Convert dates to consistent format for comparison
      const newDeadline = new Date(req.body.deadline);
      const eventDate = new Date(event.date);

      // Clear time components for date-only comparison if needed
      newDeadline.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);

      if (newDeadline > eventDate) {
        return res.status(400).json({
          message: "Task deadline cannot be after the event date",
          validation: {
            field: "deadline",
            message: "Task deadline must be before the event date",
          },
        });
      }

      if (newDeadline < new Date()) {
        return res.status(400).json({
          message: "Task deadline cannot be in the past",
          validation: {
            field: "deadline",
            message: "Task deadline must be a date in the future",
          },
        });
      }
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user._id,
    };

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName email isActive")
      .populate("updatedBy", "firstName lastName email isActive");

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
    // Get all users in the same organization
    const organizationUsers = await User.find({
      organization: req.user.organization,
    }).select("_id");

    const organizationUserIds = organizationUsers.map((user) => user._id);

    const task = await Task.findOne({
      _id: req.params.id,
      createdBy: { $in: organizationUserIds },
    })
      .populate("eventId", "name date")
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName email isActive")
      .populate("updatedBy", "firstName lastName email isActive");

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
