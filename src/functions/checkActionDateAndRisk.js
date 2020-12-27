const Action = require('../models/action');

const checkActionDateAndRisk = async (tacticalStepBody) => {
  let resultObj = {};
  const actionObj = await Action.findOne({
    _id: tacticalStepBody.action,
    project: tacticalStepBody.project,
  });
  // console.log(`action object: ${actionObj}`);
  if (!actionObj) {
    resultObj = { error: 'Action or Project not found' };
    return resultObj;
  }
  // console.log('Action Date Object: ', actionObj);
  const actionDate = actionObj.date;
  const riskPriorityName = actionObj.riskPriority.name;
  const riskPriorityWeight = actionObj.riskPriority.weight;
  const previousActionCompletion = JSON.stringify(actionObj.completion);
  // const actionDate = actionObj.date;

  // console.log('Action Date: ', actionDate);
  const tacticalStepStartDate = new Date(tacticalStepBody.start);
  const tacticalStepEndDate = new Date(tacticalStepBody.end);
  resultObj = {
    tacticalStepBody: {
      date: {
        start: tacticalStepStartDate,
        end: tacticalStepEndDate,
      },
    },
  };
  if (
    tacticalStepStartDate < actionDate.start ||
    tacticalStepEndDate > actionDate.end ||
    tacticalStepStartDate > tacticalStepEndDate
  ) {
    resultObj = {
      error:
        'TacticalStep dates breach Action Dates. Please compare against Action dates.',
    };
    return resultObj;
  }

  await actionObj.populate('tacticalsteps').execPopulate();
  resultObj.tacticalsteps = actionObj.tacticalsteps;

  console.log(resultObj);
  if (!tacticalStepBody['completion']) tacticalStepBody.completion = 0;

  resultObj.noOfSteps = resultObj.tacticalsteps.length;
  console.log('resultObj.noOfSteps: ', resultObj.noOfSteps);
  console.log('tacticalStepBody.sNoInAction: ', tacticalStepBody.sNoInAction);

  if (tacticalStepBody.sNoInAction > resultObj.noOfSteps)
    throw new Error('Position specified is invalid');

  resultObj.flag = 1;
  resultObj.riskPriorityName = riskPriorityName;
  resultObj.riskPriorityWeight = riskPriorityWeight / resultObj.noOfSteps;
  // console.log(resultObj.riskPriorityWeightNew);
  resultObj.riskPriorityWeightNew =
    riskPriorityWeight / (resultObj.noOfSteps + 1);

  // console.log(resultObj.riskPriorityWeightNew);

  // updating Action completion status -- BELOW WORKS FOR NEW ONLY
  let actionCompletion = 0;
  const actionCompletionFunc = resultObj.tacticalsteps.forEach(
    (tacticalStep) => {
      actionCompletion +=
        (resultObj.riskPriorityWeightNew * tacticalStep.completion) /
        riskPriorityWeight;
    }
  );

  actionCompletion +=
    (resultObj.riskPriorityWeightNew * tacticalStepBody.completion) /
    riskPriorityWeight;

  actionObj.completion = actionCompletion;
  actionObj.save();

  resultObj.actionCompletion = actionCompletion;
  resultObj.previousActionCompletion = previousActionCompletion;
  resultObj.actionWeight = riskPriorityWeight;

  // console.log(actionObj.tacticalsteps);
  // const actionCompletion = await Action.aggregate([
  //   {
  //     $group: {
  //       _id: null,
  //       total: {
  //         $sum: '$tacticalsteps.completion',
  //       },
  //     },
  //   },
  // ]);

  console.log('actionCompletion: ', actionCompletion);

  return resultObj;
};

module.exports = checkActionDateAndRisk;
