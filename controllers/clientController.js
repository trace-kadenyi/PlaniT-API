const mongoose = require("mongoose");

const Client = require("../models/ClientSchema");
const Event = require("../models/EventSchema");
const User = require("../models/UserSchema");

const MAX_NOTES = 200;
const MAX_PREFERENCES = 150;

// Create new client
const createClient = async (req, res) => {
  try {
    // Check notes length if provided
    if (req.body.notes && req.body.notes.length > MAX_NOTES) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Client notes cannot exceed ${MAX_NOTES} characters`,
        field: "notes",
        maxLength: MAX_NOTES,
        currentLength: req.body.notes.length,
      });
    }

    // Check prereferences length if provided
    if (req.body.preferences && req.body.preferences.length > MAX_PREFERENCES) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Client preferences cannot exceed ${MAX_PREFERENCES} characters`,
        field: "preferences",
        maxLength: MAX_PREFERENCES,
        currentLength: req.body.preferences.length,
      });
    }

    const clientData = {
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user._id,
    };

    const client = await Client.create(clientData);
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all active clients
const getAllClients = async (req, res) => {
  try {
    // Get all users in the same organization
    const organizationUsers = await User.find({
      organization: req.user.organization,
    }).select("_id");

    const organizationUserIds = organizationUsers.map((user) => user._id);

    // Show clients created by ANY user in the same organization
    const clients = await Client.find({
      createdBy: { $in: organizationUserIds },
      isDeleted: false,
    });

    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single client and their events
const getClientWithEvents = async (req, res) => {
  try {
    // Get all users in the same organization
    const organizationUsers = await User.find({
      organization: req.user.organization,
    }).select("_id");

    const organizationUserIds = organizationUsers.map((user) => user._id);

    const client = await Client.findOne({
      _id: req.params.id,
      createdBy: { $in: organizationUserIds }, // ← Only clients from same org
    });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const events = await Event.find({ client: req.params.id });

    const clientData = client.toObject();
    if (client.isDeleted) {
      clientData.name = `${client.name} (Deleted)`;
    }

    res.json({ client: clientData, events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a client
const updateClient = async (req, res) => {
  // Check notes length if provided
  if (req.body.notes && req.body.notes.length > MAX_NOTES) {
    return res.status(400).json({
      error: "ValidationError",
      message: `Client notes cannot exceed ${MAX_NOTES} characters`,
      field: "notes",
      maxLength: MAX_NOTES,
      currentLength: req.body.notes.length,
    });
  }

  // Check prereferences length if provided
  if (req.body.preferences && req.body.preferences.length > MAX_PREFERENCES) {
    return res.status(400).json({
      error: "ValidationError",
      message: `Client preferences cannot exceed ${MAX_PREFERENCES} characters`,
      field: "preferences",
      maxLength: MAX_PREFERENCES,
      currentLength: req.body.preferences.length,
    });
  }
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Archive a client (replace deleteClient)
const archiveClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      isDeleted: false, // Can't archive already deleted clients
    });

    if (!client) {
      return res
        .status(404)
        .json({ error: "Client not found or already deleted" });
    }

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
        archivedAt: new Date(),
      },
      { new: true }
    );

    res.json({
      message: "Client archived successfully",
      client: updatedClient,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Unarchive archived clients
const restoreClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      isDeleted: false, // Can't restore deleted clients (they're permanently gone)
    });

    if (!client) {
      return res
        .status(404)
        .json({ error: "Client not found or permanently deleted" });
    }

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: false,
        archivedAt: null,
      },
      { new: true }
    );

    res.json({
      message: "Client restored successfully",
      client: updatedClient,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// HANDLE CLIENT DELETE
// Permanent soft delete only
const deleteClient = async (req, res) => {
  try {
    // Validate that the ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid client ID" });
    }

    // Check if client has any associated events
    const eventCount = await Event.countDocuments({
      client: new mongoose.Types.ObjectId(String(req.params.id)),
    });

    if (eventCount > 0) {
      // Client has events - SOFT DELETE
      const client = await Client.findByIdAndUpdate(
        req.params.id,
        {
          isDeleted: true,
          deletedAt: new Date(),
          isArchived: true, // Also archive if not already
        },
        { new: true }
      );

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      return res.json({
        message:
          "Client permanently deleted (records preserved for existing events)",
        client: {
          _id: client._id,
          name: `${client.name} (Deleted)`,
          isDeleted: true,
          deletedAt: client.deletedAt,
          hasEvents: true,
          eventCount,
        },
      });
    } else {
      // Client has NO events - HARD DELETE
      const client = await Client.findByIdAndDelete(req.params.id);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      return res.json({
        message: "Client permanently deleted (no associated events)",
        deletedClient: client,
        hasEvents: false,
        eventCount: 0,
      });
    }
  } catch (err) {
    console.error("Delete client error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete all clients completely
const deleteAllClients = async (req, res) => {
  try {
    const result = await Client.updateMany(
      { isDeleted: false }, // Only delete clients that aren't already deleted
      {
        isDeleted: true,
        deletedAt: new Date(),
      }
    );

    res.json({
      message: "All clients permanently deleted successfully",
      deletedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createClient,
  getAllClients,
  getClientWithEvents,
  updateClient,
  archiveClient,
  restoreClient,
  deleteClient,
  deleteAllClients,
};
