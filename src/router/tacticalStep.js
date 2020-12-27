const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const router = new express.Router();
const TacticalStep = require('../models/tacticalStep');
const Action = require('../models/action');
const Project = require('../models/project');
const Client = require('../models/client');
// const User = require('../models/user');
const checkProjectAllowedSingleUser = require('../functions/checkProjectAllowedSingleUser');
const checkProjectAllowedFromArray = require('../functions/checkProjectAllowedFromArray');
const checkActionDateAndRisk = require('../functions/checkActionDateAndRisk');
const updateProjectStatFromStep = require('../functions/updateProjectStatFromStep');
const checkStepAllowedSingleUser = require('../functions/checkStepAllowedSingleUser');
const updateTacticalStepSerialNo = require('../functions/updateTacticalStepSerialNo');

const auth = require('../middleware/auth');
const { ObjectID } = require('mongodb');

router.post('/tacticalStep/new', auth, async (req, res) => {
  const tacticalStepBody = req.body;
  const userID = req.user._id;
  // console.log(tacticalStepBody);
  try {
    const userStatusInProject = await checkProjectAllowedSingleUser(
      userID,
      req.body.project
    );
    if (userStatusInProject === 0) {
      // console.log('Here 1');
      throw new Error('Project not found');
    }

    const multiChecks = await checkActionDateAndRisk(tacticalStepBody);
    console.log(multiChecks);
    if ('error' in multiChecks) {
      throw new Error(multiChecks.error);
    }
    console.log('User status: ', userStatusInProject);

    let flagResponsibleMatch = 0;
    if (
      userStatusInProject === 1 ||
      (userStatusInProject === 2 &&
        tacticalStepBody.responsible === req.user._id.toString())
    ) {
      flagResponsibleMatch = 1;
    }

    if (!flagResponsibleMatch) {
      throw new Error(
        'User does not have the rights to assign actions to Others. Please contact a Project Manager.'
      );
    }
    tacticalStepBody.createdBy = userID;
    tacticalStepBody.modifiedBy = userID;
    tacticalStepBody.riskPriorityName = multiChecks.riskPriorityName;
    tacticalStepBody.riskPriorityWeight = multiChecks.riskPriorityWeightNew;

    const tacticalStepArray = multiChecks.tacticalsteps;

    await updateTacticalStepSerialNo(tacticalStepArray, tacticalStepBody);

    const tacticalStep = new TacticalStep(tacticalStepBody);
    await tacticalStep.save();

    let projectStatObj = {
      projectID: tacticalStep.project,
      userID: tacticalStep.createdBy,
      name: `Update due to NEW action item ${tacticalStep.detail}`,
      stepID: tacticalStep._id,
      stepCompletion: tacticalStep.completion,
      actionWeight: multiChecks.actionWeight,
      actionCompletion: multiChecks.actionCompletion,
      previousActionCompletion: multiChecks.previousActionCompletion,
    };

    await updateProjectStatFromStep(projectStatObj);

    console.log(tacticalStep._id);

    return res.status(200).send(tacticalStep);

    // check if parent ID is valid
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// this is for all tacticalSteps of the user
router.get('/tacticalStep/:tacticalStepID', auth, async (req, res) => {
  try {
    const tacticalStepID = req.params.tacticalStepID;
    const userID = req.user._id;

    const result = await checkStepAllowedSingleUser(userID, tacticalStepID);

    res.status(200).send(result.tacticalStep);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.patch('/tacticalStep/:tacticalStepID', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'detail',
    'discussionNotes',
    'completion',
    'sNoInAction',
    'start',
    'end',
    'responsible',
    'action',
  ];

  try {
    const isValidOperation = await updates.every((update) => {
      // I added await because not sure
      return allowedUpdates.includes(update);
    });
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }

    const tacticalStepID = req.params.tacticalStepID;
    const userID = req.user._id;

    const result = await checkStepAllowedSingleUser(userID, tacticalStepID);

    const existingTacticalStep = JSON.parse(
      JSON.stringify(result.tacticalStep)
    );
    const historyElement = {
      dateMod: new Date(),
      modifiedBy: userID,
      updates: [],
    };
    const actionObj = await Action.findById(result.tacticalStep.action);
    if (updates.includes('start') || updates.includes('end')) {
      const actionDate = actionObj.date;
      const tacticalStepStartDate = req.body.start
        ? new Date(req.body.start)
        : result.tacticalStep.start;
      const tacticalStepEndDate = req.body.end
        ? new Date(req.body.end)
        : result.tacticalStep.end;

      if (
        tacticalStepStartDate < actionDate.start ||
        tacticalStepEndDate > actionDate.end ||
        tacticalStepStartDate > tacticalStepEndDate
      ) {
        console.log('in error at date');
        throw new Error(
          'TacticalStep dates breach Action Dates. Please compare against Action dates.'
        );
      }
    }
    // update user

    let updateElement = {};
    const tacticalStepArray = await TacticalStep.find({
      action: result.tacticalStep.action,
    });
    // console.log(updates);

    if (updates.includes('sNoInAction')) {
      if (req.body['sNoInAction'] > tacticalStepArray.length) {
        throw new Error('Invalid SNO');
      }
    }

    // let historyElement = `Date: ${new Date()}, ;`; //user: ${userID.toString}

    if (updates.includes('responsible')) {
      // console.log('Entered at responsible loop');
      if (result.userStatusInProject === 2) {
        // console.log('Entered at responsible loop second');
        throw new error(
          'User not allowed to update Responsible Person. Please contact Project Manager'
        );
      }
    }

    if (
      result.userStatusInProject === 1 ||
      (result.userStatusInProject === 2 &&
        result.tacticalStep.responsible.toString() === userID.toString())
    ) {
      let i = 0;
      await updates.forEach(async (update) => {
        result.tacticalStep[update] = req.body[update];
        updateElement.fieldMod = update.toString();
        updateElement.pastVal = existingTacticalStep[update].toString();
        updateElement.newVal = req.body[update].toString();

        if (update === 'sNoInAction') {
          await updateTacticalStepSerialNo(
            tacticalStepArray,
            result.tacticalStep,
            existingTacticalStep.sNoInAction
          );
        }

        if (update === 'completion') {
          let stepActionCompletionNew = req.body.completion;
          let stepActionCompletionOld = result.tacticalStep.completion;
          let stepRiskWeight = result.tacticalStep.riskPriorityWeight;

          const actionWeight = actionObj.riskPriority.weight;
          let actionCompletion = actionObj.completion;
          const actionCompletionPrevious = JSON.parse(
            JSON.stringify(actionObj.completion)
          );

          // now transform values
          actionCompletion =
            (actionCompletion * actionWeight -
              stepRiskWeight * stepActionCompletionOld +
              stepRiskWeight * stepActionCompletionNew) /
            actionWeight;

          actionObj.completion = actionCompletion;

          await actionObj.save();

          let projectStatObj = {
            projectID: result.tacticalStep.project,
            userID: req.user._id,
            name: `Update due to action ${result.tacticalStep.detail}`,
            stepID: result.tacticalStep._id,
            stepCompletion:
              req.body.completion - existingTacticalStep.completion,
            actionWeight: actionWeight,
            actionCompletion: actionCompletion,
            previousActionCompletion: actionCompletionPrevious,
            isOld: true,
          };

          await updateProjectStatFromStep(projectStatObj);
        }

        // adding in history
        historyElement.updates[i] = updateElement;

        // console.log(updateElement);
        // console.log(historyElement.updates[i]);
        // console.log(i);
        i = i + 1;
        updateElement = {};
      });
      result.tacticalStep.modifiedBy = req.user._id;

      result.tacticalStep.history.push(historyElement);

      await result.tacticalStep.save();
    } else {
      return res
        .status(200)
        .send(
          'User not allowed to edit a tacticalStep. Please ask one of the project managers.'
        );
    }

    res.status(200).send(result.tacticalStep);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
