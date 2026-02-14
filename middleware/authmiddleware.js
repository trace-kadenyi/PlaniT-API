const {
  checkPermission,
  ROLES,
  RESOURCES,
} = require("../services/permissionService");

// Middleware to check permissions
const authorize = (permission, resource) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // For resources that need target user (like user management)
      let targetUser = null;
      if (resource === RESOURCES.USER && req.params.id) {
        // Fetch target user if needed
        const User = require("../models/User");
        targetUser = await User.findById(req.params.id);
        if (!targetUser && req.params.id) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      // For expenses with paid status check
      if (
        resource === RESOURCES.EXPENSE &&
        req.params.id &&
        permission === PERMISSIONS.DELETE_PAID_EXPENSE
      ) {
        const Expense = require("../models/Expense");
        const expense = await Expense.findById(req.params.id);
        if (expense && expense.status === "paid") {
          // This will trigger the DELETE_PAID_EXPENSE permission check
          const hasPermission = checkPermission(
            req.user,
            permission,
            resource,
            null,
          );
          if (!hasPermission) {
            return res
              .status(403)
              .json({ message: "Only super admins can delete paid expenses" });
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

      // Attach target user to request for further use
      if (targetUser) {
        req.targetUser = targetUser;
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
};

// Middleware to check if user can modify another user (special case)
const authorizeUserModification = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // For routes like /users/:id
      if (req.params.id) {
        const User = require("../models/User");
        const targetUser = await User.findById(req.params.id);

        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Prevent viewers and planners from modifying ANY user
        if (req.user.role === ROLES.VIEWER || req.user.role === ROLES.PLANNER) {
          return res
            .status(403)
            .json({ message: "Insufficient permissions to modify users" });
        }

        // Prevent self-modification through admin routes
        if (targetUser._id.toString() === req.user._id.toString()) {
          return res
            .status(403)
            .json({ message: "Cannot modify yourself through this endpoint" });
        }

        // Check admin modifying super admin
        if (
          req.user.role === ROLES.ADMIN &&
          targetUser.role === ROLES.SUPER_ADMIN
        ) {
          return res
            .status(403)
            .json({ message: "Admins cannot modify super admins" });
        }

        // Check hierarchy for admins
        if (req.user.role === ROLES.ADMIN) {
          const roleHierarchy = {
            [ROLES.VIEWER]: 1,
            [ROLES.PLANNER]: 2,
            [ROLES.ADMIN]: 3,
            [ROLES.SUPER_ADMIN]: 4,
          };

          if (roleHierarchy[targetUser.role] >= roleHierarchy[ROLES.ADMIN]) {
            return res
              .status(403)
              .json({
                message: "Admins can only modify users with lower roles",
              });
          }
        }

        req.targetUser = targetUser;
      }

      next();
    } catch (error) {
      console.error("User modification authorization error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
};

// Simple role check middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Insufficient role permissions",
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

module.exports = {
  authorize,
  authorizeUserModification,
  requireRole,
  PERMISSIONS: require("../services/permissionService").PERMISSIONS,
  RESOURCES: require("../services/permissionService").RESOURCES,
  ROLES,
};
