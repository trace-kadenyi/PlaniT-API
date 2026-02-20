const mongoose = require("mongoose");

const Client = require("../models/ClientSchema");
const Event = require("../models/EventSchema");

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

    // client data
    const clientData = {
      ...req.body,
      organizationId: req.user.organization,
      createdBy: req.user._id,
    };

    const client = await Client.create(clientData);
    res.status(201).json(client);
  } catch (err) {
    console.error("Create client error:", err);
    res.status(400).json({
      error: err.name,
      message: err.message,
      details: err.errors,
    });
  }
};

// Get all active clients
const getAllClients = async (req, res) => {
  try {
    const filter = {
      organizationId: req.user.organization,
      isDeleted: false,
    };

    // Viewers cannot see archived clients
    if (req.user.role === "viewer") {
      filter.isArchived = false;
    }

    const clients = await Client.find(filter).sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single client and their events
const getClientWithEvents = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      organizationId: req.user.organization,
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Block viewers from accessing archived clients directly
    if (client.isArchived && req.user.role === "viewer") {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to view archived clients.",
      });
    }

    const events = await Event.find({
      client: client._id,
      organizationId: req.user.organization,
    });

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

    const client = await Client.findOne({
      _id: req.params.id,
      organizationId: req.user.organization,
      isDeleted: false,
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    if (client.isArchived) {
      return res.status(409).json({
        message: "Cannot update an archived client. Unarchive it first.",
      });
    }

    // Apply updates
    Object.assign(client, req.body);
    await client.save();

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
      organizationId: req.user.organization,
      isDeleted: false,
    });

    if (!client) {
      return res
        .status(404)
        .json({ error: "Client not found or already deleted" });
    }

    if (client.isArchived) {
      return res.status(409).json({ message: "Client is already archived." });
    }

    client.isArchived = true;
    client.archivedAt = new Date();
    await client.save();

    res.json({
      message: "Client archived successfully",
      client,
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
      organizationId: req.user.organization,
      isDeleted: false,
    });

    if (!client) {
      return res
        .status(404)
        .json({ error: "Client not found or permanently deleted" });
    }

    if (!client.isArchived) {
      return res.status(409).json({ message: "Client is already active." });
    }

    client.isArchived = false;
    client.archivedAt = null;
    await client.save();

    res.json({
      message: "Client restored successfully",
      client,
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

    const client = await Client.findOne({
      _id: req.params.id,
      organizationId: req.user.organization,
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Check if client has any associated events
    const eventCount = await Event.countDocuments({
      client: client._id,
      organizationId: req.user.organization,
    });

    if (eventCount > 0) {
      client.isDeleted = true;
      client.isArchived = false;
      client.deletedAt = new Date();
      await client.save();

      return res.json({
        message:
          "Client permanently deleted and removed from active records (records preserved for existing events)",
        client: {
          _id: client._id,
          name: `${client.name} (Deleted)`,
          isDeleted: true,
          deletedAt: client.deletedAt,
          hasEvents: true,
          eventCount,
        },
      });
    }
    // Client has NO events - HARD DELETE
    await client.deleteOne();

    return res.json({
      message: "Client permanently deleted (no associated events)",
      deletedClient: client,
      hasEvents: false,
      eventCount: 0,
    });
  } catch (err) {
    console.error("Delete client error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete all clients completely
const deleteAllClients = async (req, res) => {
  try {
    const clients = await Client.find({
      organizationId: req.user.organization,
      isDeleted: false,
    });

    let softDeleted = 0;
    let hardDeleted = 0;

    for (const client of clients) {
      const eventCount = await Event.countDocuments({
        client: client._id,
        organizationId: req.user.organization,
      });

      if (eventCount > 0) {
        client.isDeleted = true;
        client.isArchived = false;
        client.deletedAt = new Date();
        await client.save();
        softDeleted++;
      } else {
        await client.deleteOne();
        hardDeleted++;
      }
    }

    console.log(`softdeleted: ${softDeleted}, harddeleted: ${hardDeleted}`);

    res.json({
      message: "All clients deleted for this organization",
      summary: {
        totalProcessed: clients.length,
        softDeleted,
        hardDeleted,
      },
    });
  } catch (err) {
    console.error("Delete all clients error:", err);
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
