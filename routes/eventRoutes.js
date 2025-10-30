const express = require("express");
const router = express.Router();

const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const authController = require("../controllers/authController");

// Create new event
router.post("/", authController.protect, createEvent);

// Get all events
router.get("/", authController.protect, getAllEvents);

// Get event by ID
router.get("/:id", authController.protect, getEventById);

// Update event by ID
router.put("/:id", authController.protect, updateEvent);

// Delete event by ID
router.delete("/:id", authController.protect, deleteEvent);

module.exports = router;
