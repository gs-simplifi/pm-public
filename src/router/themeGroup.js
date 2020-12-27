const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const router = new express.Router();
const ThemeGroup = require('../models/themeGroup');
const User = require('../models/user');
const auth = require('../middleware/auth');
const { ObjectID } = require('mongodb');
// const checkUserInCompany = require('../functions/checkUserInCompany');
// const checkDomain = require('../functions/checkDomain');

router.post('/themeGroup/new', auth, async (req, res) => {
  const themeGroupBody = req.body;
  const user = req.user._id;

  try {
    themeGroupBody.createdBy = user;
    themeGroupBody.modifiedBy = user;

    const themeGroup = new ThemeGroup(themeGroupBody);
    await themeGroup.save();

    return res.status(200).send(themeGroup);

    // res.sendFile(path.resolve(__dirname, '..', '..', 'public', 'private.html'));
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// this is for all projectGroups of the user
router.get('/themeGroup/:themeGroupID?', auth, async (req, res) => {
  try {
    const client = req.user.client;
    let themeGroup;

    if (req.params.themeGroupID) {
      // console.log(req.user._id);
      themeGroup = await ThemeGroup.findById(req.params.themeGroupID);
      await themeGroup.populate('themes').execPopulate();

      const themes = themeGroup.themes;
      let fullThemeGroup = { ...themeGroup, ...themes };
      res.status(201).send(fullThemeGroup);
    } else {
      res.status(400).send('No ID provided');
    }
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.patch('/themeGroup/:themeGroupID?', auth, async (req, res) => {
  try {
    const client = req.user.client;
    const updates = Object.keys(req.body);
    const userID = req.user._id;
    const allowedUpdates = ['name'];

    if (!req.params.themeGroupID) {
      throw new Error('No themeGroup specified');
    }
    const isValidOperation = updates.every((update) => {
      // I added await because not sure
      return allowedUpdates.includes(update);
    });
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }
    const themeGroup = await ThemeGroup.findById(req.params.themeGroupID);

    const existingThemeGroup = JSON.parse(JSON.stringify(themeGroup));
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
      themeGroup[update] = req.body[update];
      updateElement.fieldMod = update.toString();
      updateElement.pastVal = existingThemeGroup[update].toString();
      updateElement.newVal = req.body[update].toString();

      historyElement.updates[i] = updateElement;

      // console.log('UpdateElement: ', updateElement);
      // console.log('Iteration: ', i);
      i = i + 1;
      updateElement = {};
    }

    themeGroup.modifiedBy = req.user._id;
    themeGroup.history.push(historyElement);
    await themeGroup.save();

    res.status(200).send(themeGroup);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
