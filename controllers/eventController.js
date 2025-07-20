const Event = require("../models/EventSchema");
const Task = require("../models/TaskSchema");

const maxChars = 300;
const maxNameChars = 70;

// Create a new event
const createEvent = async (req, res) => {
  try {
    // name word limit
    const eventName = req.body.name || "";
    if (eventName.length > maxNameChars) {
      return res.status(400).json({
        message: `Event name cannot exceed ${maxNameChars} characters.`,
      });
    }

    // description word limit
    const description = req.body.description || "";
    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }

    const event = new Event(req.body);
    const savedEvent = await event.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    // General error fallback
    res.status(400).json({
      message: err.message || "Something went wrong while creating the event.",
    });
  }
};

// Get all events
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update an event
const updateEvent = async (req, res) => {
  try {
    // name word limit
    const eventName = req.body.name || "";
    if (eventName.length > maxNameChars) {
      return res.status(400).json({
        message: `Event name cannot exceed ${maxNameChars} characters.`,
      });
    }
    // restrict description word limit
    const description = req.body.description || "";

    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(updatedEvent);
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    // General error fallback
    res.status(400).json({
      message: err.message || "Something went wrong while creating the event.",
    });
  }
};

// Delete an event
const deleteEvent = async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);

    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Cascade delete: remove tasks tied to this event
    await Task.deleteMany({ eventId: req.params.id });

    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
