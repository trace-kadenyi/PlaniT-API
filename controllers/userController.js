const { PASSWORD_REGEX } = require("../constants/regex");
const User = require("../models/UserSchema");
const UserUpdateHistory = require("../models/UserUpdateHistory");
const { generateDescription } = require("../utils/generateDescriptions");

// Get all users in current user's organization
const getUsers = async (req, res) => {
  try {
    let query = {
      organization: req.user.organization,
    };

    // If user is viewer or planner, exclude deactivated users
    if (req.user.role === "viewer" || req.user.role === "planner") {
      query.isDeactivated = false;
    }

    const users = await User.find(query).select(
      "-password -passwordResetToken -passwordResetExpires",
    );

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single user
const getUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
    }).select("-password -passwordResetToken -passwordResetExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // PREVENT VIEWERS/PLANNERS FROM ACCESSING DEACTIVATED USERS
    if (
      user.isDeactivated &&
      (req.user.role === "viewer" || req.user.role === "planner")
    ) {
      return res.status(403).json({
        message: "You don't have permission to view this user",
      });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add new user (same as addUserToOrganization but renamed)
const createUser = async (req, res) => {
  try {
    const { email, firstName, lastName, role, password } = req.body;

    // Validate password
    if (password) {
      // In userController.js
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        });
      }
    }

    // Check if user already exists in this organization
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      organization: req.user.organization,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists in this organization",
      });
    }

    // Create the user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      organization: req.user.organization,
      role: role || "viewer",
      password: password || "TempPass123!",
    });

    await newUser.save();

    const userResponse = await User.findById(newUser._id).select(
      "-password -passwordResetToken -passwordResetExpires",
    );

    res.status(201).json({
      message: "User added successfully",
      user: userResponse,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "User already exists in this organization",
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// Update user details
const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, newPassword, currentPassword } =
      req.body;

    // Find the target user
    const targetUser = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
    }).select("+password");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.isDeactivated) {
      return res.status(400).json({
        message: "Cannot update a deactivated user",
      });
    }

    const isSelf = req.user._id.toString() === req.params.userId;

    // If editing someone else, check permissions
    // if (!isSelf) {
    //   // Admins can't edit super admins
    //   if (req.user.role === "admin" && targetUser.role === "super_admin") {
    //     return res.status(403).json({
    //       message: "Cannot edit super admins",
    //     });
    //   }

    //   // Check if user has permission to edit others
    //   if (!["super_admin", "admin"].includes(req.user.role)) {
    //     return res.status(403).json({
    //       message: "Only admins can edit other users",
    //     });
    //   }
    // }

    // Track changes BEFORE modifying
    const changes = [];
    let updateType = "profile_update";

    // Check for changes BEFORE updating
    if (firstName && firstName !== targetUser.firstName) {
      changes.push({
        field: "firstName",
        oldValue: targetUser.firstName,
        newValue: firstName,
      });
    }

    if (lastName && lastName !== targetUser.lastName) {
      changes.push({
        field: "lastName",
        oldValue: targetUser.lastName,
        newValue: lastName,
      });
    }

    if (email && email.toLowerCase() !== targetUser.email) {
      changes.push({
        field: "email",
        oldValue: targetUser.email,
        newValue: email.toLowerCase(),
      });
    }

    if (phone && phone !== targetUser.contact?.phone) {
      changes.push({
        field: "phone",
        oldValue: targetUser.contact?.phone || "",
        newValue: phone,
      });
    }

    // Handle password change
    if (newPassword) {
      // If changing own password, verify current password
      if (isSelf) {
        if (!currentPassword) {
          return res.status(400).json({
            message: "Current password is required to set a new password",
          });
        }

        // Verify current password
        const isPasswordCorrect = await targetUser.correctPassword(
          currentPassword,
          targetUser.password,
        );

        if (!isPasswordCorrect) {
          return res.status(401).json({
            message: "Current password is incorrect",
          });
        }
      }

      // If admin changing someone else's password, no current password needed
      // but they must have permission
      // else if (!["super_admin", "admin"].includes(req.user.role)) {
      //   return res.status(403).json({
      //     message: "Only admins can change other users' passwords",
      //   });
      // }

      // Validate new password
      if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        });
      }

      changes.push({
        field: "password",
        oldValue: "********",
        newValue: "********",
      });
      updateType = "password_change";
    }

    // If no changes, return early
    if (changes.length === 0) {
      const currentUser = await User.findOne({
        _id: targetUser._id,
        organization: req.user.organization,
      }).select("-password -passwordResetToken -passwordResetExpires");

      return res.json({
        message: "No changes detected",
        user: currentUser,
      });
    }

    // Apply ALL changes at once
    if (firstName) targetUser.firstName = firstName;
    if (lastName) targetUser.lastName = lastName;
    if (email) targetUser.email = email.toLowerCase();
    if (phone) targetUser.contact = { ...targetUser.contact, phone };
    if (newPassword) targetUser.password = newPassword;

    await targetUser.save();

    // Create update history entry
    const updateHistory = new UserUpdateHistory({
      userId: targetUser._id,
      organization: req.user.organization,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      changes,
      type: updateType,
      description: generateDescription(changes, targetUser, req.user, isSelf),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await updateHistory.save();

    // Keep only last 50 updates
    await UserUpdateHistory.deleteMany({
      userId: targetUser._id,
      organization: req.user.organization,
      _id: {
        $nin: await UserUpdateHistory.find({
          userId: targetUser._id,
          organization: req.user.organization,
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .select("_id")
          .then((records) => records.map((r) => r._id)),
      },
    });

    const updatedUser = await User.findById(targetUser._id).select(
      "-password -passwordResetToken -passwordResetExpires",
    );

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const targetUser = req.targetUser;

    if (targetUser.isDeactivated) {
      return res.status(400).json({
        message: "Cannot update a deactivated user",
      });
    }

    // Prevent changing super admins role (only super admins can do this)
    // if (targetUser.role === "super_admin" && req.user.role !== "super_admin") {
    //   return res.status(403).json({
    //     message: "Only super admins can change super admin roles",
    //   });
    // }

    // Track role change
    const changes = [
      {
        field: "role",
        oldValue: targetUser.role,
        newValue: role,
      },
    ];

    targetUser.role = role;
    await targetUser.save();

    // Log the role change
    const updateHistory = new UserUpdateHistory({
      userId: targetUser._id,
      organization: req.user.organization,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      changes,
      type: "role_change",
      description: `${targetUser.firstName}'s role changed from ${changes[0].oldValue} to ${changes[0].newValue} by ${req.user.firstName} ${req.user.lastName}`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await updateHistory.save();

    const updatedUser = await User.findById(targetUser._id).select(
      "-password -passwordResetToken -passwordResetExpires",
    );

    res.json({
      message: "User role updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    // Permission check
    // if (!["super_admin", "admin"].includes(req.user.role)) {
    //   return res.status(403).json({
    //     message: "Only organization admins can remove users",
    //   });
    // }

    // Prevent users from removing themselves
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({
        message: "Cannot remove yourself",
      });
    }

    const targetUser = req.targetUser;

    // log deletions
    await UserUpdateHistory.create({
      userId: targetUser._id,
      organization: req.user.organization,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      type: "deactivation",
      changes: [
        {
          field: "status",
          oldValue: "Active",
          newValue: "Deactivated",
        },
      ],
      description: `${targetUser.firstName} ${targetUser.lastName} was deactivated by ${req.user.firstName} ${req.user.lastName} on ${new Date().toLocaleString()}`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    targetUser.isDeactivated = true;
    targetUser.isActive = false;
    await targetUser.save();

    res.json({
      message: "User removed successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user update history
const getUserUpdateHistory = async (req, res) => {
  try {
    // Check permissions
    // const isSelf = req.user._id.toString() === req.params.userId;
    // const isAdmin = ["super_admin", "admin"].includes(req.user.role);

    // // If not self and not admin, deny access
    // if (!isSelf && !isAdmin) {
    //   return res.status(403).json({
    //     message: "You don't have permission to view this history",
    //   });
    // }

    // Get the target user to check their role
    const targetUser = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent admins from viewing super admin history
    if (req.user.role === "admin" && targetUser.role === "super_admin") {
      return res.status(403).json({
        message: "Admins cannot view super admin history",
      });
    }

    const history = await UserUpdateHistory.find({
      userId: req.params.userId,
      organization: req.user.organization,
    })
      .populate("updatedBy", "firstName lastName email role isActive")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// reactivate user
const reactivateUser = async (req, res) => {
  try {
    // Permission check
    // if (!["super_admin", "admin"].includes(req.user.role)) {
    //   return res.status(403).json({
    //     message: "Only organization admins can reactivate users",
    //   });
    // }

    const targetUser = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
      isDeactivated: true,
    });

    if (!targetUser) {
      return res.status(404).json({
        message: "Removed user not found",
      });
    }

    // Prevent reactivating super admins unless super admin
    // if (targetUser.role === "super_admin" && req.user.role !== "super_admin") {
    //   return res.status(403).json({
    //     message: "Only super admins can reactivate super admins",
    //   });
    // }

    targetUser.isDeactivated = false;
    targetUser.isActive = true;

    await targetUser.save();

    // Log reactivation
    await UserUpdateHistory.create({
      userId: targetUser._id,
      organization: req.user.organization,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      type: "reactivation",
      changes: [
        {
          field: "status",
          oldValue: "Deactivated",
          newValue: "Active",
        },
      ],
      description: `${targetUser.firstName} ${targetUser.lastName} was reactivated by ${req.user.firstName} ${req.user.lastName}`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const cleanUser = await User.findById(targetUser._id).select(
      "-password -passwordResetToken -passwordResetExpires",
    );

    res.json({
      message: "User reactivated successfully",
      user: cleanUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  getUserUpdateHistory,
  reactivateUser,
};
