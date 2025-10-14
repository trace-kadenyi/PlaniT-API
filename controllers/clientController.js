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

    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all active clients
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single client and their events
const getClientWithEvents = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const events = await Event.find({ client: req.params.id });
    res.json({ client, events });
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
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
        archivedAt: new Date(),
      },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

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
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: false,
        archivedAt: null,
      },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      message: "Client restored successfully",
      client,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete client completely
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      message: "Client deleted successfully",
      deletedClient: client,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete all clients completely
const deleteAllClients = async (req, res) => {
  try {
    // Delete all clients
    const deletedClients = await Client.deleteMany({});

    res.json({
      message: "All clients deleted successfully",
      deletedCount: deletedClients.deletedCount,
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
