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

// PATCH /api/client/id/archive
router.patch("/:id/archive", authController.protect, archiveClient);

// PATCH /api/client/id/restore
router.patch("/:id/restore", authController.protect, restoreClient);

// DELETE /api/client/id
router.delete("/:id", authController.protect, deleteClient);

module.exports = router;
