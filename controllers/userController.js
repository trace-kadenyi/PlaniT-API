// controllers/usersController.js
const User = require("../models/UserSchema");

// Get all users in current user's organization
const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
    }).select("-password -passwordResetToken -passwordResetExpires");

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

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add new user (same as addUserToOrganization but renamed)
const createUser = async (req, res) => {
  try {
    const { email, firstName, lastName, role, password } = req.body;

    // Check if current user has permission (admin or super admin)
    if (!["super_admin", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only organization admins can add users",
      });
    }

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
      "-password -passwordResetToken -passwordResetExpires"
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
// const updateUser = async (req, res) => {
//   try {
//     const { firstName, lastName, email, phone } = req.body;

//     // Find the target user
//     const targetUser = await User.findOne({
//       _id: req.params.userId,
//       organization: req.user.organization,
//     });

//     if (!targetUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Permission check: Admins can't edit super admins
//     if (req.user.role === "admin" && targetUser.role === "super_admin") {
//       return res.status(403).json({
//         message: "Cannot edit super admins",
//       });
//     }

//     // Update fields
//     if (firstName) targetUser.firstName = firstName;
//     if (lastName) targetUser.lastName = lastName;
//     if (email) targetUser.email = email.toLowerCase();
//     if (phone) targetUser.contact = { ...targetUser.contact, phone };

//     await targetUser.save();

//     const updatedUser = await User.findById(targetUser._id).select("-password -passwordResetToken -passwordResetExpires");

//     res.json({
//       message: "User updated successfully",
//       user: updatedUser,
//     });
//   } catch (err) {
//     if (err.code === 11000) {
//       return res.status(400).json({ message: "Email already exists" });
//     }
//     res.status(500).json({ message: err.message });
//   }
// };

// Update user details - allow self-updates
// const updateUser = async (req, res) => {
//   try {
//     const { firstName, lastName, email, phone } = req.body;

//     // Find the target user
//     const targetUser = await User.findOne({
//       _id: req.params.userId,
//       organization: req.user.organization,
//     });

//     if (!targetUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const isSelf = req.user._id.toString() === req.params.userId;

//     // If editing someone else, check permissions
//     if (!isSelf) {
//       // Admins can't edit super admins
//       if (req.user.role === "admin" && targetUser.role === "super_admin") {
//         return res.status(403).json({
//           message: "Cannot edit super admins",
//         });
//       }

//       // Check if user has permission to edit others
//       if (!["super_admin", "admin"].includes(req.user.role)) {
//         return res.status(403).json({
//           message: "Only admins can edit other users",
//         });
//       }
//     }

//     // Update fields - self can update basic info
//     if (firstName) targetUser.firstName = firstName;
//     if (lastName) targetUser.lastName = lastName;
//     if (email) targetUser.email = email.toLowerCase();
//     if (phone) targetUser.contact = { ...targetUser.contact, phone };

//     await targetUser.save();

//     const updatedUser = await User.findById(targetUser._id).select("-password -passwordResetToken -passwordResetExpires");

//     res.json({
//       message: "User updated successfully",
//       user: updatedUser,
//     });
//   } catch (err) {
//     if (err.code === 11000) {
//       return res.status(400).json({ message: "Email already exists" });
//     }
//     res.status(500).json({ message: err.message });
//   }
// };

// Update user details - allow password update
const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, newPassword, currentPassword } =
      req.body;

    // Find the target user
    const targetUser = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
    }).select("+password"); // Need to select password to verify current one

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isSelf = req.user._id.toString() === req.params.userId;

    // If editing someone else, check permissions
    if (!isSelf) {
      // Admins can't edit super admins
      if (req.user.role === "admin" && targetUser.role === "super_admin") {
        return res.status(403).json({
          message: "Cannot edit super admins",
        });
      }

      // Check if user has permission to edit others
      if (!["super_admin", "admin"].includes(req.user.role)) {
        return res.status(403).json({
          message: "Only admins can edit other users",
        });
      }
    }

    // Update basic fields
    if (firstName) targetUser.firstName = firstName;
    if (lastName) targetUser.lastName = lastName;
    if (email) targetUser.email = email.toLowerCase();
    if (phone) targetUser.contact = { ...targetUser.contact, phone };

    // Handle password change (only for self or admins with permission)
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
          targetUser.password
        );

        if (!isPasswordCorrect) {
          return res.status(401).json({
            message: "Current password is incorrect",
          });
        }
      }

      // If admin changing someone else's password, no current password needed
      // but they must have permission
      else if (!["super_admin", "admin"].includes(req.user.role)) {
        return res.status(403).json({
          message: "Only admins can change other users' passwords",
        });
      }

      // Validate new password
      // In userController.js
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        });
      }

      // Set new password
      targetUser.password = newPassword;
    }

    await targetUser.save();

    const updatedUser = await User.findById(targetUser._id).select(
      "-password -passwordResetToken -passwordResetExpires"
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

    // Permission check
    if (!["super_admin", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only organization admins can update user roles",
      });
    }

    const targetUser = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent changing super admins role (only super admins can do this)
    if (targetUser.role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        message: "Only super admins can change super admin roles",
      });
    }

    targetUser.role = role;
    await targetUser.save();

    const updatedUser = await User.findById(targetUser._id).select(
      "-password -passwordResetToken -passwordResetExpires"
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
    if (!["super_admin", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only organization admins can remove users",
      });
    }

    // Prevent users from removing themselves
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({
        message: "Cannot remove yourself",
      });
    }

    const targetUser = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent removing super admins
    if (targetUser.role === "super_admin") {
      return res.status(403).json({
        message: "Cannot remove super admins",
      });
    }

    await User.findByIdAndDelete(req.params.userId);

    res.json({
      message: "User removed successfully",
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
};
