const express = require("express");
const router = express.Router();

const {
  createClient,
  getAllClients,
  getClientWithEvents,
  updateClient,
  archiveClient,
  restoreClient,
  deleteClient,
  deleteAllClients,
} = require("../controllers/clientController");
const authController = require("../controllers/authController");

// POST /api/clients
router.post("/", authController.protect, createClient);

// GET /api/clients
router.get("/", authController.protect, getAllClients);

// GET /api/clients/:id
router.get("/:id", authController.protect, getClientWithEvents);

// PUT /api/clients/:id
router.put("/:id", authController.protect, updateClient);

// PATCH /api/clients/id/archive
router.patch("/:id/archive", authController.protect, archiveClient);

// PATCH /api/clients/id/restore
router.patch("/:id/restore", authController.protect, restoreClient);

// DELETE /api/clients/id
router.delete("/:id", authController.protect, deleteClient);

// DELETE /api/clients
router.delete("/", authController.protect, deleteAllClients);

module.exports = router;
