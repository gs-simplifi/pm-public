const User = require('../models/user');

const addUserToProject = async (userId, assignedById, projectId) => {
  const user = await User.findById(userId);

  const project = {
    id: projectId,
    assignedBy: assignedById,
    assignedOn: new Date(),
  };

  user.projects = user.projects.concat({ project });

  await user.save();

  return;
};

module.exports = addUserToProject;
