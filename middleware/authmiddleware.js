const {
  checkPermission,
  PERMISSIONS,
  RESOURCES,
} = require("../services/permissionService");

const authorize = (permission, resource) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let targetUser = null;

      // USER resource handling
      if (resource === RESOURCES.USER && req.params.id) {
        const User = require("../models/User");
        targetUser = await User.findById(req.params.id);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      // EXPENSE paid deletion special handling
      if (
        resource === RESOURCES.EXPENSE &&
        permission === PERMISSIONS.DELETE &&
        req.params.id
      ) {
        const Expense = require("../models/Expense");
        const expense = await Expense.findById(req.params.id);

        if (expense?.status === "paid") {
          const canDeletePaid = checkPermission(
            req.user,
            PERMISSIONS.DELETE_PAID_EXPENSE,
            RESOURCES.EXPENSE,
          );

          if (!canDeletePaid) {
            return res.status(403).json({
              message: "Only super admins can delete paid expenses",
            });
          }
        }
      }

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

      if (targetUser) req.targetUser = targetUser;

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
};

module.exports = { authorize };
