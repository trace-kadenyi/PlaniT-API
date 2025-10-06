const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser"); 
const helmet = require("helmet")


// mongoose/mongodb
const mongoose = require("mongoose");

// dotenv
require("dotenv").config();

// port
const PORT = process.env.PORT || 4000;

// path
const path = require("path");

// Security headers
app.use(helmet());

// import routes
const root = require("./routes/root");
const taskRoutes = require("./routes/taskRoutes");
const eventRoutes = require("./routes/eventRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const clientRoutes = require("./routes/clientRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const authRoutes = require("./routes/authRoutes");

// connect to MongoDB
mongoose.connect(process.env.DATABASE_URI);

require("dotenv").config();
app.use(express.json());

// cors
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// cookie-parser
app.use(cookieParser());

// middleware to handle static files
app.use(express.static(path.join(__dirname, "public")));

// Add this before your other routes in server.js
app.get('/api/debug-cookies-set', (req, res) => {
  console.log('Setting debug cookie...');
  res.cookie('debugCookie', 'test-value', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });
  res.json({ message: 'Debug cookie should be set' });
});

app.get('/api/debug-cookies-check', (req, res) => {
  console.log('Received cookies:', req.cookies);
  res.json({ 
    receivedCookies: req.cookies,
    headers: req.headers
  });
});

// use routes
app.use("/", root);
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/vendors", vendorRoutes);

// ERROR HANDLING MIDDLEWARE (important for auth)
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error",
  });
});

// // Fallback for undefined routes
app.all(/.*/, (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// start server
mongoose.connection.once("open", () => {
  console.log("connected to MongoDB");
  app.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`);
  });
});
