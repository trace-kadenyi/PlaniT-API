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
          message: "Authentication required",
        });
      }

      let targetUser = null;

      // ===============================
      // 2️⃣ Load target user if needed
      // ===============================
      if (resource === RESOURCES.USER && req.params.id) {
        targetUser = await User.findById(req.params.id);

        if (!targetUser) {
          return res.status(404).json({
            message: "User not found",
          });
        }
      }

      // ===============================
      // 3️⃣ Base permission check
      // ===============================
      const hasPermission = checkPermission(
        req.user,
        permission,
        resource,
        targetUser,
      );

      if (!hasPermission) {
        return res.status(403).json({
          message: "Access denied",
          required: { permission, resource },
        });
      }

      // ===============================
      // 4️⃣ Context-aware rule:
      // Paid expense deletion
      // ===============================
      if (
        resource === RESOURCES.EXPENSE &&
        permission === PERMISSIONS.DELETE &&
        req.params.id
      ) {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
          return res.status(404).json({
            message: "Expense not found",
          });
        }

        if (expense.paymentStatus === "paid") {
          const canDeletePaid = checkPermission(
            req.user,
            PERMISSIONS.DELETE_PAID_EXPENSE,
            RESOURCES.EXPENSE,
          );

          if (!canDeletePaid) {
            return res.status(403).json({
              message: "You don't have permission to delete paid expenses",
            });
          }
        }
      }

      // Attach targetUser if needed downstream
      if (targetUser) {
        req.targetUser = targetUser;
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({
        message: "Authorization check failed",
      });
    }
  };
};

module.exports = { authorize };
