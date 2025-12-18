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
const organizationRoutes = require("./routes/organizationRoutes");

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

// ========== RATE LIMITING SETUP ==========

// More permissive rate limiting for refresh token
const refreshTokenLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 refresh attempts per minute (more permissive)
  message: "Too many token refresh attempts. Please slow down.",
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      message:
        "Too many token refresh attempts. Please wait a moment before trying again.",
    });
  },
});

// Aggressive rate limiting for sensitive auth routes
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // CHANGE TO 15 AFTER DEVELOPMENT
  max: 100, // CHANGE TO 10 AFTER DEVELOPMENT
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      message:
        "Too many login attempts. Please wait 15 minutes before trying again.",
    });
  },
});

// Add this before your routes
// let requestCounts = {};

// app.use((req, res, next) => {
//   const path = req.path;
//   const ip = req.ip;

//   if (!requestCounts[ip]) {
//     requestCounts[ip] = {};
//   }

//   if (!requestCounts[ip][path]) {
//     requestCounts[ip][path] = 0;
//   }

//   requestCounts[ip][path]++;

//   // Log refresh token requests
//   if (path.includes('refresh-token')) {
//     console.log(`Refresh token request #${requestCounts[ip][path]} from ${ip} at ${new Date().toISOString()}`);
//   }

//   next();
// });

// Add a debug endpoint to see counts
app.get("/api/debug/rate-limit-status", (req, res) => {
  res.json({
    requestCounts,
    totalRefreshTokens: Object.values(requestCounts).reduce((acc, ipData) => {
      return acc + (ipData["/api/auth/refresh-token"] || 0);
    }, 0),
    timestamp: new Date().toISOString(),
  });
});

// General rate limiting for all other API routes
// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again later.",
//   // Skip refresh-token since we have a separate limiter for it
//   skip: (req) => req.originalUrl === "/api/auth/refresh-token",
// });
// app.use("/api/", generalLimiter);

// Apply refresh token limiter specifically to refresh-token endpoint
app.use("/api/auth/refresh-token", refreshTokenLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

// ========== END RATE LIMITING SETUP ==========

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
app.use("/api/organization", organizationRoutes);
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
