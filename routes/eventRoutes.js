const express = require("express");
const router = express.Router();

const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");

// Create new event
router.post("/", createEvent);

// Get all events
router.get("/", getAllEvents);

// Get event by ID
router.get("/:id", getEventById);

// Update event by ID
router.put("/:id", updateEvent);

// Delete event by ID
router.delete("/:id", deleteEvent);

module.exports = router;
