const {
  checkPermission,
  PERMISSIONS,
  RESOURCES,
} = require("../services/permissionService");

// Import models at the top
const User = require("../models/UserSchema");
const Expense = require("../models/ExpenseSchema");

const authorize = (permission, resource) => {
  return async (req, res, next) => {
    try {
      // ===============================
      // 1️⃣ Authentication check
      // ===============================
      if (!req.user) {
        return res.status(401).json({
          error: "Unauthorized",
          code: "AUTH_REQUIRED",
          message: "You must be logged in to perform this action.",
        });
      }

      let targetUser = null;
      let expense = null;

      // ===============================
      // 2️⃣ Load target user if needed
      // ===============================
      if (resource === RESOURCES.USER && req.params.id) {
        targetUser = await User.findOne({
          _id: req.params.id,
          organization: req.user.organization,
        });

        if (!targetUser) {
          return res.status(404).json({
            error: "Not Found",
            code: "USER_NOT_FOUND",
            message: "User not found.",
          });
        }
      }

      // ===============================
      // 3️⃣ Load expense if needed
      // ===============================
      if (
        resource === RESOURCES.EXPENSE &&
        permission === PERMISSIONS.DELETE &&
        req.params.id
      ) {
        expense = await Expense.findOne({
          _id: req.params.id,
          organization: req.user.organization,
        });

        if (!expense) {
          return res.status(404).json({
            error: "Not Found",
            code: "EXPENSE_NOT_FOUND",
            message: "Expense not found.",
          });
        }

        // ===============================
        // 4️⃣ Context-aware rule:
        // Paid expense deletion
        // ===============================
        if (expense.paymentStatus === "paid") {
          const canDeletePaid = checkPermission(
            req.user,
            PERMISSIONS.DELETE_PAID_EXPENSE,
            RESOURCES.EXPENSE,
          );

          if (!canDeletePaid) {
            return res.status(403).json({
              error: "Forbidden",
              code: "DELETE_PAID_EXPENSE_RESTRICTED",
              message: "Only Super Admins can delete paid expenses.",
              details: {
                permission,
                resource,
              },
            });
          }
        }
      }

      // ===============================
      // 5️⃣ General permission check
      // ===============================
      const hasPermission = checkPermission(
        req.user,
        permission,
        resource,
        targetUser,
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSION",
          message: "You do not have permission to perform this action.",
          details: {
            permission,
            resource,
          },
        });
      }

      if (targetUser) req.targetUser = targetUser;

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        code: "AUTHORIZATION_CHECK_FAILED",
        message: "Authorization check failed.",
      });
    }
  };
};

module.exports = { authorize };
