const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const router = new express.Router();
const Project = require('../models/project');
const User = require('../models/user');
const addUserToProject = require('../functions/addUserToProject');
const checkProjectAllowedFromArray = require('../functions/checkProjectAllowedFromArray');
const ProjectStat = require('../models/projectStat');
const auth = require('../middleware/auth');
const { compare } = require('bcryptjs');
const { ObjectID } = require('mongodb');
// const checkUserInCompany = require('../functions/checkUserInCompany');
// const checkDomain = require('../functions/checkDomain');

router.post('/project/new', auth, async (req, res) => {
  const projectBody = req.body;
  const user = req.user._id;

  try {
    // check if all users are part of the company... make it part of save?
    // handle this at the time of sending. and not at time of saving

    // when Parent ID - check if parentID is valid... make it part of save?
    // handle this at the time of sending. and not at time of saving
    projectBody.createdBy = user;
    projectBody.modifiedBy = user;

    if (projectBody.users.projectManagers === undefined) {
      projectBody.users.projectManagers = [user.toString()];
    } else {
      projectBody.users.projectManagers.unshift(user.toString());
    }

    const project = new Project(projectBody);
    await project.save();

    await addUserToProject(user, user, project._id);

    const projectStatBody = {
      project: project._id,
      statusUpdate: [
        {
          name: 'Project Initialized',
          totalActionItems: 0,
          closedActionItems: 0,
          totalRiskScore: 0,
          closedRiskScore: 0,
          user: user,
        },
      ],
    };

    const projectStat = new ProjectStat(projectStatBody);

    await projectStat.save();

    return res.status(200).send(project);

    // res.sendFile(path.resolve(__dirname, '..', '..', 'public', 'private.html'));
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// this is for all projects of the user
router.get('/projects/:url?', auth, async (req, res) => {
  try {
    const client = req.user.client;
    let project;

    if (req.params.url) {
      // console.log(req.user._id);
      project = await Project.findByURL(
        req.params.url,
        req.user._id.toString()
      );
      await project.populate('projectstats').execPopulate();
      const stats = project.projectstats;
      let fullProject = { ...project, ...stats };
      res.status(201).send(fullProject);
    } else {
      const user = await User.findById(req.user._id);
      // console.log(user);
      console.log(`Involved in ${user.projects.length} number of projects`);

      for (let i = 0; i < user.projects.length; i++) {
        currentProject = await Project.findById(user.projects[i].project.id);
        console.log(currentProject.name);
      }
      return res.status(200).send(req.user.projects);
    }
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.patch('/projects/:url?', auth, async (req, res) => {
  try {
    const client = req.user.client;
    const updates = Object.keys(req.body);
    const userID = req.user._id;
    const allowedUpdates = ['name', 'url', 'date', 'users', 'parentID'];

    if (!req.params.url) {
      throw new Error('No project specified');
    }
    const isValidOperation = updates.every((update) => {
      // I added await because not sure
      return allowedUpdates.includes(update);
    });
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }
    const project = await Project.findByURL(
      req.params.url,
      req.user._id.toString()
    );

    const userStatusInProject = checkProjectAllowedFromArray(
      project.users,
      req.user._id
    );

    if (userStatusInProject === 0) {
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      return res
        .status(200)
        .send(
          'User not allowed to edit a Project. Please ask one of the project managers.'
        );
    } else {
      const existingProject = JSON.parse(JSON.stringify(project));
      const historyElement = {
        dateMod: new Date(),
        modifiedBy: req.user._id,
        updates: [],
      };
      let updateElement = {};

      let i = 0;
      let update;

      for (let j = 0; j < updates.length; j++) {
        update = updates[j];
        project[update] = req.body[update];
        updateElement.fieldMod = update.toString();
        updateElement.pastVal = existingProject[update].toString();
        updateElement.newVal = req.body[update].toString();

        if (update === 'parentID') {
          // Check if valid parent ID.
          throw new Error('Feature to be applied.');
        }

        if (update === 'date') {
          let newStartDate;
          let newEndDate;
          let flagDate = 0;
          let dateMod = {};
          let startDateMod = {};
          let actionFlagDate = 0;
          if (req.body[update].start) {
            newStartDate = req.body[update].start;
            flagDate += 1;
            dateMod.fieldMod = 'date.start';
            dateMod.pastVal = existingProject.date.start.toString();
            dateMod.newVal = newStartDate.toString();
            startDateMod = JSON.parse(JSON.stringify(dateMod));
          } else {
            newStartDate = existingProject.date.start;
          }
          if (req.body[update].end) {
            newEndDate = req.body[update].end;
            flagDate += 1;
            dateMod.fieldMod = 'date.end';
            dateMod.pastVal = existingProject.date.end.toString();
            dateMod.newVal = newEndDate.toString();
          } else {
            newEndDate = existingProject.date.end;
          }

          //update History
          if (flagDate === 2) {
            historyElement.updates[i] = startDateMod;
            i = i + 1;
          }
          updateElement = dateMod;
          newStartDate = new Date(newStartDate);
          newEndDate = new Date(newEndDate);

          project[update].start = newStartDate;
          project[update].end = newEndDate;

          await project.populate('actions').execPopulate();

          console.log(
            'Found following number of actions: ',
            project.actions.length
          );

          // check date Validity
          // project auto checked at save
          // to check only for steps

          project.actions.forEach((action) => {
            // console.log('came till here');
            // console.log('Tac Step Start Date: ', tacStep.start);
            // console.log('New start date: ', newStartDate);
            if (
              newStartDate > action.date.start ||
              newEndDate < action.date.end
            ) {
              console.log('comes in errpr loop');
              actionFlagDate = 1;

              console.log('StepFlagDate: ', actionFlagDate);
              if (actionFlagDate) {
                throw new Error(
                  'Date provided will alter the tactical steps. Please chage the steps and come back here, or please provide correct dates'
                );
              }
            }
          });
        }

        historyElement.updates[i] = updateElement;

        // console.log('UpdateElement: ', updateElement);
        // console.log('Iteration: ', i);
        i = i + 1;
        updateElement = {};
      }

      project.modifiedBy = req.user._id;
      project.history.push(historyElement);
      await project.save();
    }

    res.status(200).send(project);
  } catch (e) {
    res.status(400).send(e.message);
  }
});
// this is for me
// router.get('/project/me', async (req, res) => {
//   // res.send(req.project);
// });

// router.get('/:id', async (req, res) => {
//   const _id = req.params.id;

//   try {
//     const project = await Project.findById(_id);
//     if (!project) {
//       return res.status(404).send('project not found');
//     }
//     res.status(201).send(project);
//   } catch (e) {
//     res.status(400).send(e.message);
//   }
// });

module.exports = router;
