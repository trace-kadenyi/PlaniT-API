const Organization = require("../models/OrganizationSchema");
const User = require("../models/UserSchema");
const { PASSWORD_REGEX } = require("../constants/regex");

// Add user to organization
const addUserToOrganization = async (req, res) => {
  try {
    const { email, firstName, lastName, role, password } = req.body;

    // validate password
    if (password) {
      if (!PASSWORD_REGEX.test(password)) {
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

    // Create the user directly
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      organization: req.user.organization,
      role: role || "viewer",
      password: password || "tempPassword123", // You might want to generate a random one (to be done)
    });

    await newUser.save();

    res.status(201).json({
      message: "User added to organization successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
      },
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

// Get all users in organization
const getOrganizationUsers = async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
    }).select("-password");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remove user from organization
const removeUserFromOrganization = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent users from removing themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        message: "Cannot remove yourself from organization",
      });
    }

    // identify user to be removed
    const userToRemove = await User.findOne({
      _id: userId,
      organization: req.user.organization,
    });

    if (!userToRemove) {
      return res.status(404).json({
        message: "User not found in organization",
      });
    }

    // Prevent removing organization super admin
    if (userToRemove.role === "super_admin") {
      return res.status(403).json({
        message: "Cannot remove organization super admin",
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      message: "User removed from organization successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update user role in organization
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // identify user to update
    const userToUpdate = await User.findOne({
      _id: userId,
      organization: req.user.organization,
    });

    if (!userToUpdate) {
      return res.status(404).json({
        message: "User not found in organization",
      });
    }

    // Prevent changing super admins role (only super admins can transfer ownership)
    if (
      userToUpdate.role === "super_admin" &&
      req.user.role !== "super_admin"
    ) {
      return res.status(403).json({
        message: "Only organization super admins can change super admins role",
      });
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    res.json({
      message: "User role updated successfully",
      user: {
        id: userToUpdate._id,
        firstName: userToUpdate.firstName,
        lastName: userToUpdate.lastName,
        role: userToUpdate.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get organization details
const getOrganizationDetails = async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    res.json({
      id: organization._id,
      name: organization.name,
      plan: organization.plan,
      settings: organization.settings,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  addUserToOrganization,
  getOrganizationUsers,
  removeUserFromOrganization,
  updateUserRole,
  getOrganizationDetails,
};
