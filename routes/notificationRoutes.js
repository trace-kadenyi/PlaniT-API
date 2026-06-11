const express = require("express");
const router = express.Router();
const { protect } = require("../controllers/authController");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.use(protect);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/mark-all-read", markAllAsRead);

module.exports = router;
