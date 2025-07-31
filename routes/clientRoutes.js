const express = require("express");
const router = express.Router();

const {
  createClient,
  getAllClients,
  getClientWithEvents,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

// POST /api/clients
router.post("/", createClient);

// GET /api/clients
router.get("/", getAllClients);

// GET /api/clients/:id
router.get("/:id", getClientWithEvents);

// PUT /api/clients/:id
router.put("/:id", updateClient);

// DELETE /api/clients/id
router.delete("/:id", deleteClient);

module.exports = router;
