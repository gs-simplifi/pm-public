const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const router = new express.Router();
const ProjectGroup = require('../models/projectGroup');
const User = require('../models/user');
const auth = require('../middleware/auth');
const { ObjectID } = require('mongodb');
// const checkUserInCompany = require('../functions/checkUserInCompany');
// const checkDomain = require('../functions/checkDomain');

router.post('/projectGroup/new', auth, async (req, res) => {
  const projectGroupBody = req.body;
  const user = req.user._id;

  try {
    projectGroupBody.createdBy = user;
    projectGroupBody.modifiedBy = user;

    const projectGroup = new ProjectGroup(projectGroupBody);
    await projectGroup.save();

    return res.status(200).send(projectGroup);

    // res.sendFile(path.resolve(__dirname, '..', '..', 'public', 'private.html'));
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// this is for all projectGroups of the user
router.get('/projectGroups/:url?', auth, async (req, res) => {
  try {
    const client = req.user.client;
    let projectGroup;

    if (req.params.url) {
      // console.log(req.user._id);
      projectGroup = await ProjectGroup.findOne({ url: req.params.url });
      await projectGroup.populate('projects').execPopulate();

      const projects = projectGroup.projects;
      let fullProjectGroup = { ...projectGroup, ...projects };
      res.status(201).send(fullProjectGroup);
    } else {
      res.status(400).send('No ID provided');
    }
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.patch('/projectGroups/:url?', auth, async (req, res) => {
  try {
    const client = req.user.client;
    const updates = Object.keys(req.body);
    const userID = req.user._id;
    const allowedUpdates = ['name', 'url'];

    if (!req.params.url) {
      throw new Error('No projectGroup specified');
    }
    const isValidOperation = updates.every((update) => {
      // I added await because not sure
      return allowedUpdates.includes(update);
    });
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }
    const projectGroup = await ProjectGroup.findOne({ url: req.params.url });

    const existingProjectGroup = JSON.parse(JSON.stringify(projectGroup));
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
      projectGroup[update] = req.body[update];
      updateElement.fieldMod = update.toString();
      updateElement.pastVal = existingProjectGroup[update].toString();
      updateElement.newVal = req.body[update].toString();

      historyElement.updates[i] = updateElement;

      // console.log('UpdateElement: ', updateElement);
      // console.log('Iteration: ', i);
      i = i + 1;
      updateElement = {};
    }

    projectGroup.modifiedBy = req.user._id;
    projectGroup.history.push(historyElement);
    await projectGroup.save();

    res.status(200).send(projectGroup);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
