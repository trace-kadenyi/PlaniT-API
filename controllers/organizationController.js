const Organization = require("../models/OrganizationSchema");
const User = require("../models/UserSchema");
const { PASSWORD_REGEX } = require("../constants/regex");




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
    const { id } = req.params;

    // Prevent users from removing themselves
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        message: "Cannot remove yourself from organization",
      });
    }

    // identify user to be removed
    const userToRemove = req.targetUser;

    // Prevent removing organization super admin
    if (userToRemove.role === "super_admin") {
      return res.status(403).json({
        message: "Cannot remove organization super admin",
      });
    }

    await userToRemove.deleteOne();

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
    const { role } = req.body;

    // identify user to update
    const userToUpdate = req.targetUser;

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
