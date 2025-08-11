const mongoose = require("mongoose");

const Event = require("../models/EventSchema");
const Task = require("../models/TaskSchema");
const Budget = require("../models/BudgetSchema");
const Expense = require("../models/ExpenseSchema");

const maxChars = 300;
const maxNameChars = 70;
const maxSummaryChars = 200;

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

    // name word limit
    const eventName = eventData.name || "";
    if (eventName.length > maxNameChars) {
      return res.status(400).json({
        message: `Event name cannot exceed ${maxNameChars} characters.`,
      });
    }

    // description word limit
    const description = eventData.description || "";
    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }

    // Summary word limit
    const summary = eventData.summary || "";
    if (summary.length > maxSummaryChars) {
      return res.status(400).json({
        message: `Event summary cannot exceed ${maxSummaryChars} characters.`,
      });
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
// const getAllEvents = async (req, res) => {
//   try {
//     // const events = await Event.find().sort({ createdAt: -1 }).lean();
//     const events = await Event.find()
//       .populate("client")
//       .populate("vendors", "name services")
//       .sort({ createdAt: -1 })
//       .lean();

//     // Format all dates consistently
//     const formattedEvents = events.map((event) => ({
//       ...event,
//       date: event.date?.toISOString(),
//       createdAt: event.createdAt?.toISOString(),
//       updatedAt: event.updatedAt?.toISOString(),
//     }));

//     res.json(formattedEvents);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

const getAllEvents = async (req, res) => {
  try {
    // First get all events without vendors
    const events = await Event.find()
      .populate("client")
      .sort({ createdAt: -1 })
      .lean();

    // Get all expenses grouped by event
    const expensesByEvent = await Expense.aggregate([
      {
        $group: {
          _id: "$eventId",
          expenseIds: { $push: "$_id" },
        },
      },
    ]);

    // Get vendors for each event's expenses
    const eventsWithVendors = await Promise.all(
      events.map(async (event) => {
        const eventExpenses = expensesByEvent.find(
          (e) => e._id.toString() === event._id.toString()
        );

        let vendors = [];
        if (eventExpenses) {
          const expenses = await Expense.find({
            _id: { $in: eventExpenses.expenseIds },
          }).populate("vendor", "name services isArchived");

          const vendorMap = new Map();
          expenses.forEach((expense) => {
            if (
              expense.vendor &&
              !vendorMap.has(expense.vendor._id.toString())
            ) {
              vendorMap.set(expense.vendor._id.toString(), expense.vendor);
            }
          });
          vendors = Array.from(vendorMap.values());
        }

        return {
          ...event,
          vendors,
          date: event.date?.toISOString(),
          createdAt: event.createdAt?.toISOString(),
          updatedAt: event.updatedAt?.toISOString(),
        };
      })
    );

    res.json(eventsWithVendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get event by ID
// const getEventById = async (req, res) => {
//   try {
//     // const event = await Event.findById(req.params.id).lean();
//     const event = await Event.findById(req.params.id)
//       .populate("client")
//       .populate("vendors", "name services isArchived")
//       .lean();

//     if (!event) {
//       return res.status(404).json({ message: "Event not found" });
//     }

//     // Get budget and expense totals
//     const budget = await Budget.findOne({ eventId: req.params.id }).lean();
//     const expenses = await Expense.aggregate([
//       {
//         $match: { eventId: new mongoose.Types.ObjectId(String(req.params.id)) },
//       },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]);

//     const responseData = {
//       ...event,
//       budget: budget || null,
//       totalExpenses: expenses[0]?.total || 0,
//       date: event.date?.toISOString(),
//       createdAt: event.createdAt?.toISOString(),
//       updatedAt: event.updatedAt?.toISOString(),
//     };

//     res.json(responseData);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

const getEventById = async (req, res) => {
  try {
    // First get the basic event data
    const event = await Event.findById(req.params.id).populate("client").lean();

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get all expenses for this event to calculate totals and get vendors
    const expenses = await Expense.find({ eventId: req.params.id }).populate(
      "vendor",
      "name services isArchived"
    );

    // Calculate total expenses
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Get unique vendors from expenses
    const vendorMap = new Map();
    expenses.forEach((expense) => {
      if (expense.vendor && !vendorMap.has(expense.vendor._id.toString())) {
        vendorMap.set(expense.vendor._id.toString(), expense.vendor);
      }
    });
    const vendors = Array.from(vendorMap.values());

    // Get budget
    const budget = await Budget.findOne({ eventId: req.params.id }).lean();

    const responseData = {
      ...event,
      vendors, // Add the derived vendors list
      budget: budget || null,
      totalExpenses,
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

    // name word limit
    const eventName = updateData.name || "";
    if (eventName.length > maxNameChars) {
      return res.status(400).json({
        message: `Event name cannot exceed ${maxNameChars} characters.`,
      });
    }

    // description word limit
    const description = updateData.description || "";
    if (description.length > maxChars) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${maxChars} characters.` });
    }

    // Summary word limit
    const summary = updateData.summary || "";
    if (summary.length > maxSummaryChars) {
      return res.status(400).json({
        message: `Event summary cannot exceed ${maxSummaryChars} characters.`,
      });
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
