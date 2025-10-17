const Organization = require("../models/OrganizationSchema");
const User = require("../models/UserSchema");

// Add user to organization (admin function)
const addUserToOrganization = async (req, res) => {
  try {
    const { email, firstName, lastName, organizationRole, password } = req.body;

    // Check if current user has permission (admin or owner)
    if (!["owner", "admin"].includes(req.user.organizationRole)) {
      return res.status(403).json({
        message: "Only organization admins can add users",
      });
    }

    // Check organization user limit
    const organization = await Organization.findById(req.user.organization);
    const currentUserCount = await User.countDocuments({
      organization: req.user.organization,
    });

    if (currentUserCount >= organization.maxUsers) {
      return res.status(400).json({
        message: "Organization user limit reached",
      });
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
      organizationRole: organizationRole || "planner",
      password: password || "tempPassword123", // You might want to generate a random one
      role: "planner", // Keep your existing role system
    });

    await newUser.save();

    res.status(201).json({
      message: "User added to organization successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        organizationRole: newUser.organizationRole,
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

    // Check permissions
    if (!["owner", "admin"].includes(req.user.organizationRole)) {
      return res.status(403).json({
        message: "Only organization admins can remove users",
      });
    }

    // Prevent users from removing themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        message: "Cannot remove yourself from organization",
      });
    }

    const userToRemove = await User.findOne({
      _id: userId,
      organization: req.user.organization,
    });

    if (!userToRemove) {
      return res.status(404).json({
        message: "User not found in organization",
      });
    }

    // Prevent removing organization owners
    if (userToRemove.organizationRole === "owner") {
      return res.status(403).json({
        message: "Cannot remove organization owner",
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
