const ProjectStat = require('../models/projectStat');

const updateProjectStatFromStep = async (
  projectStatObj
  // projectID,
  // userID,
  // name,
  // stepID,
  // stepCompletion, // to adjust closedAction Item
  // actionWeight, // to adjust closed risk score
  // previousActionCompletion
  // actionCompletion // use action Weight to adjust completed Risk Score
  //isOld - to see if an update or new item
) => {
  const projectstat = await ProjectStat.findOne({
    project: projectStatObj.projectID,
  });

  const lastStatusUpdate =
    projectstat.statusUpdate[projectstat.statusUpdate.length - 1];

  const newUpdate = {
    name: projectStatObj.name,
    totalActionItems:
      lastStatusUpdate.totalActionItems + 1 - (projectStatObj.isOld ? 1 : 0),
    closedActionItems:
      lastStatusUpdate.closedActionItems + projectStatObj.stepCompletion,
    totalRiskScore: lastStatusUpdate.totalRiskScore,
    closedRiskScore:
      lastStatusUpdate.closedRiskScore -
      projectStatObj.previousActionCompletion +
      projectStatObj.actionCompletion,
    dueToActionname: projectStatObj.stepID,
    user: projectStatObj.userID,
  };

  //temporary fix
  newUpdate.closedRiskScore < 0
    ? (newUpdate.closedRiskScore = 0)
    : (newUpdate.closedRiskScore = newUpdate.closedRiskScore);

  await projectstat.statusUpdate.push(newUpdate);
  // ProjectStat.update(
  //   { _id: projectstat._id },
  //   { $push: { statusUpdate: newUpdate } }
  // );

  await projectstat.save();

  // console.log('projectstat Updated: ', projectstat);
  // console.log('projectstat Object: ', projectStatObj);

  // console.log('last element: ', lastStatusUpdate);
  // console.log('last element: ', newUpdate);

  return;
};

module.exports = updateProjectStatFromStep;
