const Organization = require("../models/OrganizationSchema");

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
  getOrganizationDetails,
};
