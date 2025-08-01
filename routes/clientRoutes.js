const express = require("express");
const router = express.Router();

const {
  createClient,
  getAllClients,
  getClientWithEvents,
  updateClient,
  archiveClient,
  restoreClient,
} = require("../controllers/clientController");

// POST /api/clients
router.post("/", createClient);

// GET /api/clients
router.get("/", getAllClients);

// GET /api/clients/:id
router.get("/:id", getClientWithEvents);

// PUT /api/clients/:id
router.put("/:id", updateClient);

// PUT /api/clients/id
router.put("/:id", archiveClient);

// PATCH /api/client/id/archive
router.patch("/:id/archive", archiveClient);

// PATCH /api/client/id/restore
router.patch("/:id/restore", restoreClient);

module.exports = router;
