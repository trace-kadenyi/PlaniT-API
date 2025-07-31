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


