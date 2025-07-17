const Task = require("../models/TaskSchema");

// Get all tasks
const getAllTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.eventId) {
      filter.eventId = req.query.eventId;
    }
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};






