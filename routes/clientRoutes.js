const express = require("express");
const router = express.Router();

const {
  createClient,
  getAllClients,
  getClientWithEvents,
} = require("../controllers/clients.controller");

// POST /api/clients
router.post("/", createClient);

// GET /api/clients
router.get("/", getAllClients);

// GET /api/clients/:id
router.get("/:id", getClientWithEvents);

module.exports = router;
