const Notification = require("../models/NotificationSchema");

// Get all notifications for the logged-in user
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
      organization: req.user.organization,
    })
      .sort({ createdAt: -1 })
      .limit(50); // cap at 50, most recent first

    res.json({ status: "success", data: notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user._id, // ensure ownership
      },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ status: "success", data: notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user._id,
        organization: req.user.organization,
        read: false,
      },
      { read: true },
    );

    res.json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
