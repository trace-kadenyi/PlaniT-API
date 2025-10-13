const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// mongoose/mongodb
const mongoose = require("mongoose");

// dotenv
require("dotenv").config();

// port
const PORT = process.env.PORT || 4000;

// path
const path = require("path");

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

// cors
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// cookie-parser
app.use(cookieParser());

// Security headers
app.use(helmet());

// Rate limiting - prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// More aggressive rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // only 10 login attempts per 15 minutes
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      message:
        "Too many login attempts. Please wait 15 minutes before trying again.",
    });
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

app.use(express.json());

// middleware to handle static files
app.use(express.static(path.join(__dirname, "public")));

// Add this before your other routes in server.js
app.get("/api/debug-cookies-set", (req, res) => {
  console.log("Setting debug cookie...");
  res.cookie("debugCookie", "test-value", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ message: "Debug cookie should be set" });
});

app.get("/api/debug-cookies-check", (req, res) => {
  console.log("Received cookies:", req.cookies);
  res.json({
    receivedCookies: req.cookies,
    headers: req.headers,
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
