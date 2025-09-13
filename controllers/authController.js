const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/UserSchema");

// Generate JWT tokens
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};








