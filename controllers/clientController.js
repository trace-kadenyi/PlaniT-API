const Client = require("../models/ClientSchema");
const Event = require("../models/EventSchema");

// Create new client
const createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all clients
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
