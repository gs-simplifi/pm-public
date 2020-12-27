const Project = require('../models/project');
const checkProjectAllowedFromArray = require('../functions/checkProjectAllowedFromArray');

const checkProjectAllowedSingleUser = async (userID, projectID) => {
  const project = await Project.findById(projectID);
  // console.log(userFound);

  const userStatus = checkProjectAllowedFromArray(project.users, userID);

  return userStatus;
};

module.exports = checkProjectAllowedSingleUser;
