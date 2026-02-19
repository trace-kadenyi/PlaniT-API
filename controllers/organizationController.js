const Organization = require("../models/OrganizationSchema");
const User = require("../models/UserSchema");
const { PASSWORD_REGEX } = require("../constants/regex");



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
