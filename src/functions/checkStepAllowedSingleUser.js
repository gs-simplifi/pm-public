const TacticalStep = require('../models/tacticalStep');

const checkProjectAllowedSingleUser = require('./checkProjectAllowedSingleUser');

const checkStepAllowedSingleUser = async (userID, tacticalStepID) => {
  const tacticalStep = await TacticalStep.findById(tacticalStepID);
  let result = {};
  if (!tacticalStep) {
    throw new Error('Tactical Step not found');
  }
  const userStatusInProject = await checkProjectAllowedSingleUser(
    userID,
    tacticalStep.project
  );

  if (userStatusInProject === 0) {
    throw new Error('TacticalStep not found');
  } else if (userStatusInProject === 2 || userStatusInProject === 1) {
    result.userStatusInProject = userStatusInProject;
  } else {
    throw new Error(
      'User not allowed to enter an tacticalStep. Please contact a Project Manager of this project.'
    );
  }
  result.tacticalStep = tacticalStep;
  return result;
};

module.exports = checkStepAllowedSingleUser;
