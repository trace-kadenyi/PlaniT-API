const mongoose = require("mongoose");

const Event = require("../models/EventSchema");
const Task = require("../models/TaskSchema");
const Budget = require("../models/BudgetSchema");
const Expense = require("../models/ExpenseSchema");

const maxChars = 300;
const maxNameChars = 70;

// Date normalization middleware
const normalizeEventDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes()
    )
  );
};

// Create a new event
const createEvent = async (req, res) => {
  try {
    // Normalize the date before creating
    const eventDate = normalizeEventDate(req.body.date);

    // Check if event date is in the past
    if (eventDate !== null && eventDate < new Date()) {
      return res.status(400).json({
        message: "Event date cannot be in the past",
      });
    }

    const eventData = {
      ...req.body,
      date: eventDate,
    };

    // name word limit (keep existing)
    const eventName = eventData.name || "";
    if (eventName.length > maxNameChars) {
      return res.status(400).json({
        message: `Event name cannot exceed ${maxNameChars} characters.`,
      });
    }

    // description word limit (keep existing)
    const description = eventData.description || "";
    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }

    const event = new Event(eventData); // Use normalized data
    const savedEvent = await event.save();

    // Create associated budget
    const budget = new Budget({
      eventId: savedEvent._id,
      totalBudget: req.body.initialBudget || 0,
      notes: req.body.budgetNotes || "",
    });
    await budget.save();

    res.status(201).json({
      event: savedEvent,
      budgetId: budget._id,
    });
  } catch (err) {
    // Keep existing error handling
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(400).json({
      message: err.message || "Something went wrong while creating the event.",
    });
  }
};
// Get all events
const getAllEvents = async (req, res) => {
  try {
    // const events = await Event.find().sort({ createdAt: -1 }).lean();
    const events = await Event.find()
      .populate("client") // 👈 This loads full client data
      .sort({ createdAt: -1 })
      .lean();

    // Format all dates consistently
    const formattedEvents = events.map((event) => ({
      ...event,
      date: event.date?.toISOString(),
      createdAt: event.createdAt?.toISOString(),
      updatedAt: event.updatedAt?.toISOString(),
    }));

    res.json(formattedEvents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get event by ID
const getEventById = async (req, res) => {
  try {
    // const event = await Event.findById(req.params.id).lean();
    const event = await Event.findById(req.params.id).populate("client").lean();

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get budget and expense totals
    const budget = await Budget.findOne({ eventId: req.params.id }).lean();
    const expenses = await Expense.aggregate([
      {
        $match: { eventId: new mongoose.Types.ObjectId(String(req.params.id)) },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const responseData = {
      ...event,
      budget: budget || null,
      totalExpenses: expenses[0]?.total || 0,
      date: event.date?.toISOString(),
      createdAt: event.createdAt?.toISOString(),
      updatedAt: event.updatedAt?.toISOString(),
    };

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update an event
const updateEvent = async (req, res) => {
  try {
    // Normalize the date if provided
    let eventDate;
    if (req.body.date) {
      eventDate = normalizeEventDate(req.body.date);
      // Check if event date is in the past
      if (eventDate !== null && eventDate < new Date()) {
        return res.status(400).json({
          message: "Event date cannot be in the past",
        });
      }
    }

    const updateData = req.body.date
      ? { ...req.body, date: eventDate }
      : req.body;

    // name word limit (keep existing)
    const eventName = updateData.name || "";
    if (eventName.length > maxNameChars) {
      return res.status(400).json({
        message: `Event name cannot exceed ${maxNameChars} characters.`,
      });
    }

    // description word limit (keep existing)
    const description = updateData.description || "";
    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData, // Use normalized data
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
    // Keep existing error handling
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(400).json({
      message: err.message || "Something went wrong while updating the event.",
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

    // Cascade delete all related documents
    await Promise.all([
      Task.deleteMany({ eventId: req.params.id }),
      Budget.deleteOne({ eventId: req.params.id }),
      Expense.deleteMany({ eventId: req.params.id }),
    ]);

    res.json({ message: "Event and all related data deleted" });
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
