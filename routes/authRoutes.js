const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// signup
router.post("/signup", authController.signup);

// login
router.post("/login", authController.login);

// refresh token
router.post("/refresh-token", authController.refreshToken);

// refresh token WITH LOGGING MIDDLEWARE
// router.post("/refresh-token", (req, res, next) => {
//   console.log('Refresh token request received:', {
//     timestamp: new Date().toISOString(),
//     ip: req.ip,
//     cookies: Object.keys(req.cookies),
//     userAgent: req.headers['user-agent']
//   });
//   next();
// }, authController.refreshToken);

// forgot password
router.post("/forgot-password", authController.forgotPassword);

// reset password
router.patch("/reset-password/:token", authController.resetPassword);

// logout
router.post("/logout", authController.logout);

module.exports = router;
