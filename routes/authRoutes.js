const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// signup
router.post("/signup", authController.signup);

// login
router.post("/login", authController.login);

// refresh token
router.post("/refresh-token", authController.refreshToken);

// forgot password
router.post("/forgot-password", authController.forgotPassword);

// reset password
router.patch("/reset-password/:token", authController.resetPassword);

module.exports = router;
