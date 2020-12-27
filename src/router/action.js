const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const router = new express.Router();
const Action = require('../models/action');
const Project = require('../models/project');
const ProjectStat = require('../models/projectStat');
const Client = require('../models/client');
// const User = require('../models/user');
const checkProjectAllowedSingleUser = require('../functions/checkProjectAllowedSingleUser');
const checkProjectAllowedFromArray = require('../functions/checkProjectAllowedFromArray');

const auth = require('../middleware/auth');
const { ObjectID } = require('mongodb');
const updateSerialNo = require('../functions/updateSerialNo');
const Theme = require('../models/theme');
const ThemeGroup = require('../models/themeGroup');
const { Cipher } = require('crypto');

router.post('/action/new', auth, async (req, res) => {
  const actionBody = req.body;
  const userID = req.user._id;

  try {
    const userStatusInProject = await checkProjectAllowedSingleUser(
      userID,
      req.body.project
    );
    if (userStatusInProject === 0) {
      // console.log('Here 1');
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      // console.log('Here 2');
      return res
        .status(200)
        .send(
          'User not allowed to enter an action. Please contact a Project Manager of this project.'
        );
    } else {
      // console.log('Here 3');
      actionBody.createdBy = userID;
      actionBody.modifiedBy = userID;

      const actionArray = await Action.find({ theme: actionBody.theme });
      console.log(actionBody);
      // Last check - get serial number, and update other serial numbers.
      if (actionBody.sNoInTheme < 0) {
        // Last postions

        actionBody.sNoInTheme = actionArray.length + 1;
      } else if (actionBody.sNoInTheme === 0) {
        // first position
        actionBody.sNoInTheme = 1;

        actionArray.forEach(async (element) => {
          element.sNoInTheme = element.sNoInTheme + 1;
          await element.save();
        });
      } else {
        if (actionBody.sNoInTheme > actionArray.length)
          throw new Error('Position specified is invalid');

        actionArray.forEach(async (element) => {
          if (element.sNoInTheme >= actionBody.sNoInTheme) {
            element.sNoInTheme = element.sNoInTheme + 1;
            await element.save();
          }
        });

        console.log('enterd here');
        //position specified
      }

      // throw new Error('taken a break');

      const action = new Action(actionBody);
      await action.save();

      return res.status(200).send(action);
    }

    // check if parent ID is valid
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// this is for all actions of the user
router.get('/action/:projectURL/:actionID', auth, async (req, res) => {
  try {
    const actionID = req.params.actionID;
    const projectURL = req.params.projectURL;
    const project = await Project.findOne({ url: projectURL });

    const action = await Action.findOne({
      _id: actionID,
      project: project._id,
    });
    // console.log(action);

    const userStatusInProject = await checkProjectAllowedSingleUser(
      req.user._id,
      action.project
    );

    if (userStatusInProject === 0) {
      throw new Error('Action not found');
    } else if (userStatusInProject === 2 || userStatusInProject === 1) {
      await action.populate('tacticalsteps').execPopulate();
      const displayAction = { ...action, ...action.tacticalsteps };
      res.status(200).send({ action: action, steps: action.tacticalsteps });
    } else {
      return res
        .status(200)
        .send(
          'User not allowed to enter an action. Please contact a Project Manager of this project.'
        );
    }
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.patch('/action/:projectURL/:actionID', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const userID = req.user._id;
  const allowedUpdates = [
    'name',
    'description',
    'theme',
    'riskPriority',
    'sNoInTheme',
    'date',
  ];

  try {
    const isValidOperation = await updates.every((update) => {
      // I added await because not sure
      return allowedUpdates.includes(update);
    });
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }
    if (
      (updates.includes('theme') ||
        updates.includes('riskPriority') ||
        updates.includes('sNoInTheme')) &&
      updates.length > 1
    ) {
      throw new Error(
        'When changing  the theme, sNo or risk priority, only one input allowed.'
      );
    }

    const actionID = req.params.actionID;
    const projectURL = req.params.projectURL;
    const project = await Project.findOne({ url: projectURL });

    if (!project) throw new Error('Wrong project url');
    //
    const userStatusInProject = checkProjectAllowedFromArray(
      project.users,
      req.user._id
    );
    const action = await Action.findOne({
      _id: actionID,
      project: project._id,
    });
    if (!action) throw new Error('Wrong action url');

    if (userStatusInProject === 0) {
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      return res
        .status(200)
        .send(
          'User not allowed to edit a action. Please ask one of the project managers.'
        );
    } else {
      const existingAction = JSON.parse(JSON.stringify(action));
      const historyElement = {
        dateMod: new Date(),
        modifiedBy: req.user._id,
        updates: [],
      };
      let updateElement = {};

      let i = 0;
      let stepFlagDate = 0;
      let update;
      let actionArray;
      if ((update = 'sNoInTheme')) {
        actionArray = await Action.find({ theme: action.theme });
      }
      for (let j = 0; j < updates.length; j++) {
        update = updates[j];
        action[update] = req.body[update];
        updateElement.fieldMod = update.toString();
        updateElement.pastVal = existingAction[update].toString();
        updateElement.newVal = req.body[update].toString();

        if (update === 'sNoInTheme') {
          await updateSerialNo({
            modelName: 'action',
            sNoName: 'sNoInTheme',
            updateArray: actionArray,
            updateBody: action,
            type: 'update',
            previosuSerial: existingAction.sNoInTheme,
          });
          updateElement.newVal = action[update];
        }

        if (update === 'theme') {
          // console.log('Step 1');
          let newThemeID = req.body.theme;
          if ((newThemeID = action.theme)) {
            throw new Error('THeme iD has not been updated.');
          }
          // first check if new theme ID is part of same project.
          // console.log('Project', existingAction.project);
          // console.log('Theme ID', newThemeID);
          const newTheme = await Theme.findOne({
            project: existingAction.project,
            _id: newThemeID,
          });
          if (!newTheme) {
            throw new Error('Theme Id provided is wrong');
          }
          // console.log('Step 2');
          // console.log(newTheme);

          // then add this to other theme at end.
          action[update] = newThemeID;
          action['sNoInTheme'] = -1;
          actionArray = await Action.find({ theme: action.theme });
          await updateSerialNo({
            modelName: 'action',
            sNoName: 'sNoInTheme',
            updateArray: actionArray,
            updateBody: action,
            type: 'new',
            previosuSerial: '',
          });
          updateElement.newVal = action[update];

          // then remove from current place
          actionArray = await Action.find({ theme: existingAction.theme });
          await updateSerialNo({
            modelName: 'action',
            sNoName: 'sNoInTheme',
            updateArray: actionArray,
            updateBody: action,
            type: 'delete',
            previosuSerial: '',
          });
          // updateElement.newVal = action[update];

          // await updateSerialNo({
          //   modelName: 'action',
          //   sNoName: 'sNoInTheme',
          //   updateArray: actionArray,
          //   updateBody: action,
          //   type: 'update',
          //   previosuSerial: existingAction.sNoInTheme,
          // });
          // updateElement.newVal = action[update];
        }

        if (update === 'date') {
          let newStartDate;
          let newEndDate;
          let flagDate = 0;
          let dateMod = {};
          let startDateMod = {};
          if (req.body[update].start) {
            newStartDate = req.body[update].start;
            flagDate += 1;
            dateMod.fieldMod = 'date.start';
            dateMod.pastVal = existingAction.date.start.toString();
            dateMod.newVal = newStartDate.toString();
            startDateMod = JSON.parse(JSON.stringify(dateMod));
          } else {
            newStartDate = existingAction.date.start;
          }
          if (req.body[update].end) {
            newEndDate = req.body[update].end;
            flagDate += 1;
            dateMod.fieldMod = 'date.end';
            dateMod.pastVal = existingAction.date.end.toString();
            dateMod.newVal = newEndDate.toString();
          } else {
            newEndDate = existingAction.date.end;
          }

          //update History
          if (flagDate === 2) {
            historyElement.updates[i] = startDateMod;
            i = i + 1;
          }
          updateElement = dateMod;
          newStartDate = new Date(newStartDate);
          newEndDate = new Date(newEndDate);
          action[update].start = newStartDate;
          action[update].end = newEndDate;

          await action.populate('tacticalsteps').execPopulate();
          // console.log(action.tacticalsteps.length);

          // check date Validity
          // project auto checked at save
          // to check only for steps

          action.tacticalsteps.forEach((tacStep) => {
            // console.log('Tac Step Start Date: ', tacStep.start);
            // console.log('New start date: ', newStartDate);
            if (newStartDate > tacStep.start || newEndDate < tacStep.end) {
              // console.log('comes in errpr loop');
              stepFlagDate = 1;

              // console.log('StepFlagDate: ', stepFlagDate);
              if (stepFlagDate) {
                throw new Error(
                  'Date provided will alter the tactical steps. Please chage the steps and come back here, or please provide correct dates'
                );
              }
            }
          });
        }

        if (update === 'riskPriority') {
          const newName = req.body.riskPriority.name;
          let newWeight;
          // console.log(`new name: ${newName}; actionName`);
          if (newName === existingAction.riskPriority.name) {
            throw new Error('there is no update of risk priority');
          }

          // check if part of risk Priority group of client, and get riskWeight

          const clientRiskPriorityObject = await Client.findById(
            project.client
          ).select('riskPriority');

          if (!clientRiskPriorityObject) throw new Error('Client not found');

          const clientRiskPriority = clientRiskPriorityObject.riskPriority;
          // console.log(clientRiskPriorityObject);
          let riskFlag = 0;
          for (let r = 0; r < clientRiskPriority.length; r++) {
            // console.log(
            //   `iteration: ${r}; riskPriority: ${clientRiskPriority[r].name}, newName: ${newName}`
            // );
            if (clientRiskPriority[r].name === newName) {
              riskFlag = 1;
              newWeight = parseFloat(clientRiskPriority[r].weight);
            }
          }
          if (!riskFlag)
            throw new Error(
              'THe risk category does not belong to this client.'
            );
          action.riskPriority.weight = newWeight;
          // change risk weight and name of tactical steps.
          //get updated completion of steps, and of action -
          // formula for completion based on weight
          let element;
          await action.populate('tacticalsteps').execPopulate();
          // console.log(action.tacticalsteps.length);
          // console.log(`newWeight: ${newWeight}, type: ${typeof newWeight}`);
          const stepWeight = parseFloat(
            newWeight / action.tacticalsteps.length
          );
          // console.log(stepWeight);
          for (let at = 0; at < action.tacticalsteps.length; at++) {
            element = action.tacticalsteps[at];
            element.riskPriorityName = newName;

            element.riskPriorityWeight = stepWeight;
            // console.log(`Iteration ${at}; id: ${element}; riskName:
            // ${element.riskPriorityName}; riskWeight: ${element.riskPriorityWeight}`);
            await element.save();

            // let projectStatObj = {
            //   projectID: action.project,
            //   userID: req.user._id,
            //   name: `Update due to action ${element.detail}`,
            //   stepID: element._id,
            //   stepCompletion: element.completion,
            //   actionWeight: newWeight,
            //   actionCompletion: existingAction.actionCompletion,
            //   previousActionCompletion: existingAction.completion,
            // };

            // await updateProjectStatFromStep(projectStatObj);
          }

          const projectstat = await ProjectStat.findOne({
            project: action.project,
          });
          const lastStatusUpdate =
            projectstat.statusUpdate[projectstat.statusUpdate.length - 1];

          const newUpdate = {
            name: `Action priority changed from ${existingAction.riskPriority.name} to ${newName}`,
            totalActionItems: lastStatusUpdate.totalActionItems,
            closedActionItems: lastStatusUpdate.closedActionItems,
            totalRiskScore:
              lastStatusUpdate.totalRiskScore -
              existingAction.riskPriority.weight +
              newWeight,
            closedRiskScore:
              lastStatusUpdate.closedRiskScore -
              existingAction.riskPriority.weight * existingAction.completion +
              newWeight * existingAction.completion,

            user: req.user._id,
          };
          // newUpdate.closedRiskScore < 0
          //   ? (newUpdate.closedRiskScore = 0)
          //   : (newUpdate.closedRiskScore = newUpdate.closedRiskScore);
          await projectstat.statusUpdate.push(newUpdate);
          await projectstat.save();
          //---------------------
          // update projectStat for updated risk - total risk score, and closed risk score

          updateElement.pastVal = JSON.stringify(existingAction.riskPriority);
          updateElement.newVal = JSON.stringify(action.riskPriority);
        }

        historyElement.updates[i] = updateElement;

        // console.log('UpdateElement: ', updateElement);
        // console.log('Iteration: ', i);
        i = i + 1;
        updateElement = {};
      }

      action.modifiedBy = req.user._id;
      action.history.push(historyElement);
      await action.save();
    }

    res.status(200).send(action);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
