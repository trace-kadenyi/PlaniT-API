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
// const getAllClients = async (req, res) => {
//   try {
//     // Get all users in the same organization
//     const organizationUsers = await User.find({
//       organization: req.user.organization,
//     }).select("_id");

//     const organizationUserIds = organizationUsers.map((user) => user._id);

//     // Show clients created by ANY user in the same organization
//     const clients = await Client.find({
//       createdBy: { $in: organizationUserIds },
//       isDeleted: false,
//     });

//     res.json(clients);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find({
      organizationId: req.user.organization,
      isDeleted: false,
    }).sort({ createdAt: -1 });

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

    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organization,
        isDeleted: false,
      },
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
    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organization,
        isDeleted: false,
      },
      {
        isArchived: true,
        archivedAt: new Date(),
      },
      { new: true }
    );

    if (!client) {
      return res
        .status(404)
        .json({ error: "Client not found or already deleted" });
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
    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organization,
        isDeleted: false,
      },
      {
        isArchived: false,
        archivedAt: null,
      },
      { new: true }
    );

    if (!client) {
      return res
        .status(404)
        .json({ error: "Client not found or permanently deleted" });
    }

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
      client.isArchived = true;
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
// const deleteAllClients = async (req, res) => {
//   try {
//     const result = await Client.updateMany(
//       { isDeleted: false }, // Only delete clients that aren't already deleted
//       {
//         isDeleted: true,
//         deletedAt: new Date(),
//       }
//     );

//     res.json({
//       message: "All clients permanently deleted successfully",
//       deletedCount: result.modifiedCount,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

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
        client.isArchived = true;
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
