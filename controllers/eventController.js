const mongoose = require("mongoose");

const Event = require("../models/EventSchema");
const Task = require("../models/TaskSchema");
const Budget = require("../models/BudgetSchema");
const Expense = require("../models/ExpenseSchema");
const User = require("../models/UserSchema");
const Client = require("../models/ClientSchema");
const supabaseAdmin = require("../utils/supabaseAdmin");

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
      d.getUTCMinutes(),
    ),
  );
};

// Create a new event
const createEvent = async (req, res) => {
  try {
    // If assigning a client, check if that client exists and is not deleted
    if (req.body.client) {
      const client = await Client.findOne({
        _id: req.body.client,
        organizationId: req.user.organization,
        isDeleted: false,
      });

      if (!client) {
        return res.status(400).json({
          message: "Cannot assign a deleted or non-existent client to an event",
        });
      }
    }

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
      organizationId: req.user.organization,
      date: eventDate,
      createdBy: req.user._id,
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
      organizationId: req.user.organization,
      totalBudget: req.body.initialBudget || 0,
      notes: req.body.budgetNotes || "",
    });
    await budget.save();

    // assignedto user
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { assignedEvents: savedEvent._id },
    });

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
    const isAdmin =
      req.user.role === "admin" || req.user.role === "super_admin";

    const filter = {
      organizationId: req.user.organization,
      isDeleted: false,
    };

    // Non-admins should not see archived events
    if (!isAdmin) {
      filter.isArchived = false;
    }
    // Show events created by ANY user in the same organization
    const events = await Event.find(filter)
      .populate("client")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    // Get all expenses grouped by event
    const expensesByEvent = await Expense.aggregate([
      {
        $match: {
          organizationId: req.user.organization,
        },
      },
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
          (e) => e._id.toString() === event._id.toString(),
        );

        let vendors = [];
        if (eventExpenses) {
          const expenses = await Expense.find({
            _id: { $in: eventExpenses.expenseIds },
          }).populate("vendor", "name services isArchived isDeleted");

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
      }),
    );

    res.json(eventsWithVendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get event by ID
const getEventById = async (req, res) => {
  try {
    // Only allow access if event was created by someone in the same organization
    const event = await Event.findOne({
      _id: req.params.id,
      organizationId: req.user.organization,
      isDeleted: false,
    })
      .populate("client")
      .populate("createdBy", "firstName lastName isActive")
      .populate("updatedBy", "firstName lastName email isActive")
      .lean();

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // restrict access for archived events
    if (event.isArchived && !["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to view archived events",
      });
    }

    // Get all expenses for this event to calculate totals and get vendors
    const expenses = await Expense.find({
      eventId: req.params.id,
      organizationId: req.user.organization,
    }).populate("vendor", "name services isArchived isDeleted");

    // Calculate total expenses
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
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
    const budget = await Budget.findOne({
      eventId: req.params.id,
      organizationId: req.user.organization,
    }).lean();

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
    if (req.user.role === "viewer") {
      return res.status(403).json({ message: "Read-only access" });
    }

    const existingEvent = await Event.findOne({
      _id: req.params.id,
      organizationId: req.user.organization,
      isDeleted: false,
    });

    if (!existingEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (existingEvent.isArchived) {
      return res.status(400).json({
        message: "Archived events cannot be edited",
      });
    }

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
      ? { ...req.body, date: eventDate, updatedBy: req.user._id }
      : { ...req.body, updatedBy: req.user._id };

    // SANITIZATION: Handle empty strings for ObjectId fields
    if (updateData.client === "") {
      updateData.client = null; // Convert empty string to null
    }

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

    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organization,
      },
      updateData,
      { new: true, runValidators: true },
    )
      .populate("createdBy", "firstName lastName email isActive")
      .populate("updatedBy", "firstName lastName email isActive")
      .populate("client");

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

// archive an event
const archiveEvent = async (req, res) => {
  try {
    if (!["planner", "admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const event = await Event.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organization,
        isDeleted: false,
      },
      {
        isArchived: true,
        archivedAt: new Date(),
      },
      { new: true },
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      message: "Event archived successfully",
      event,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete an event
const deleteEvent = async (req, res) => {
  try {
    // 🔹 fetch expenses FIRST (for receipts)
    const expensesWithReceipts = await Expense.find({
      eventId: req.params.id,
      organizationId: req.user.organization,
      receiptUrl: { $exists: true, $ne: null },
    }).select("receiptUrl");

    // event to be deleted
    const deletedEvent = await Event.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organization,
    });

    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Cascade delete all related documents
    await Promise.all([
      Task.deleteMany({ eventId: req.params.id }),
      Budget.deleteOne({
        eventId: req.params.id,
        organizationId: req.user.organization,
      }),
      Expense.deleteMany({
        eventId: req.params.id,
        organizationId: req.user.organization,
      }),
    ]);

    // 🔹 DELETE RECEIPTS FROM SUPABASE (non-blocking)
    for (const expense of expensesWithReceipts) {
      try {
        const filePath = new URL(expense.receiptUrl).pathname.split(
          "planit-receipts/",
        )[1];

        if (filePath) {
          await supabaseAdmin.storage
            .from("planit-receipts")
            .remove([filePath]);
        }
      } catch (err) {
        console.warn(
          "Receipt deletion failed:",
          expense.receiptUrl,
          err.message,
        );
        // intentionally non-blocking
      }
    }

    // If event had a client, check if client should be hard-deleted
    let clientHardDeleted = false;
    let clientName = null;

    if (deletedEvent.client) {
      // Check if client is soft-deleted and has no other events
      const client = await Client.findById(deletedEvent.client);

      if (client && client.isDeleted) {
        // Count remaining events for this client
        const remainingEvents = await Event.countDocuments({
          client: deletedEvent.client,
          organizationId: req.user.organization,
        });

        // If no more events, hard delete the client
        if (remainingEvents === 0) {
          await Client.findByIdAndDelete(deletedEvent.client);
          clientHardDeleted = true;
          clientName = client.name;
        }
      }
    }

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
