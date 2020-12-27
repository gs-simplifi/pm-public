const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const router = new express.Router();
const Theme = require('../models/theme');
const Project = require('../models/project');
// const User = require('../models/user');
const checkProjectAllowedSingleUser = require('../functions/checkProjectAllowedSingleUser');
const checkProjectAllowedFromArray = require('../functions/checkProjectAllowedFromArray');

const auth = require('../middleware/auth');
const updateSerialNo = require('../functions/updateSerialNo');
const { ObjectID } = require('mongodb');

router.post('/theme/new', auth, async (req, res) => {
  const themeBody = req.body;
  const userID = req.user._id;

  try {
    // check user allowed on project = completed
    const userStatusInProject = await checkProjectAllowedSingleUser(
      userID,
      req.body.project
    );
    if (userStatusInProject === 0) {
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      return res.status(200).send('User not allowed to enter a theme');
    } else {
      themeBody.createdBy = userID;
      themeBody.modifiedBy = userID;
      let themeArray;
      if (themeBody.hasOwnProperty('parentID') && themeBody.parentID != '') {
        console.log('Theme group loop');
        themeArray = await Theme.find({ parentID: themeBody.parentID });
      } else {
        console.log('Direct Project loop');
        themeArray = await Theme.find({ project: themeBody.project });
      }

      // console.log(themeArray);
      await updateSerialNo({
        modelName: 'theme',
        sNoName: 'sNo',
        updateArray: themeArray,
        updateBody: themeBody,
        type: 'new',
        previosuSerial: '',
      });

      const theme = new Theme(themeBody);
      await theme.save();

      return res.status(200).send(theme);
    }

    // check if parent ID is valid
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// this is for all themes of the user
router.get('/themes/:projectURL/:themeID?', auth, async (req, res) => {
  try {
    const projectURL = req.params.projectURL;
    const project = await Project.findByURL(projectURL, req.user._id);

    if (req.params.themeID) {
      const theme = await Theme.findOne({
        _id: req.params.themeID,
        project: project._id,
      });

      return res.status(200).send(theme);
    } else {
      await project.populate('themes').execPopulate();
      const themes = project.themes;
      return res.status(200).send(themes);
    }
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.patch('/themes/:projectURL/:themeID?', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'sNo'];

  try {
    const isValidOperation = await updates.every((update) => {
      // I added await because not sure
      return allowedUpdates.includes(update);
    });
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }

    const projectURL = req.params.projectURL;
    const project = await Project.findOne({ url: projectURL });
    //
    const userStatusInProject = checkProjectAllowedFromArray(
      project.users,
      req.user._id
    );
    const theme = await Theme.findOne({
      _id: req.params.themeID,
      project: project._id,
    });

    if (userStatusInProject === 0) {
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      return res
        .status(200)
        .send(
          'User not allowed to edit a theme. Please ask one of the project managers.'
        );
    } else {
      const existingTheme = JSON.parse(JSON.stringify(theme));
      const historyElement = {
        dateMod: new Date(),
        modifiedBy: req.user._id,
        updates: [],
      };
      let updateElement = {};

      let i = 0;
      let update;
      let themeArray;
      if ((update = 'sNo')) {
        if (theme.hasOwnProperty('parentID') && theme.parentID != '') {
          console.log('Theme group loop');
          themeArray = await Theme.find({ parentID: theme.parentID });
        } else {
          console.log('Direct Project loop');
          themeArray = await Theme.find({ project: theme.project });
        }
      }

      for (let j = 0; j < updates.length; j++) {
        update = updates[j];
        theme[update] = req.body[update];
        updateElement.fieldMod = update.toString();
        updateElement.pastVal = existingTheme[update].toString();
        updateElement.newVal = req.body[update].toString();

        if (update === 'sNo') {
          await updateSerialNo({
            modelName: 'theme',
            sNoName: 'sNo',
            updateArray: themeArray,
            updateBody: theme,
            type: 'update',
            previosuSerial: existingTheme.sNo,
          });
          updateElement.newVal = theme[update];
        }
        historyElement.updates[i] = updateElement;
        i = i + 1;
        updateElement = {};
      }

      theme.modifiedBy = req.user._id;
      theme.history.push(historyElement);

      await theme.save();
    }

    res.status(200).send(theme);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
