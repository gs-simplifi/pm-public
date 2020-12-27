const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const router = new express.Router();
const Meeting = require('../models/meeting');
const Project = require('../models/project');
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

router.post('/meeting/:projectURL/new', auth, async (req, res) => {
  const meetingBody = req.body;
  const userID = req.user._id;
  const projectURL = req.params.projectURL;

  try {
    if (!projectURL) throw new Error('No project entered');

    const project = await Project.findOne({ url: projectURL });

    if (!project) throw new Error('No project found');

    // console.log(meeting);

    const userStatusInProject = await checkProjectAllowedFromArray(
      project.users,
      req.user._id
    );
    if (userStatusInProject === 0) {
      // console.log('Here 1');
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      // console.log('Here 2');
      return res
        .status(200)
        .send(
          'User not allowed to enter a meeting. Please contact a Project Manager of this project.'
        );
    } else {
      // console.log('Here 3');
      meetingBody.project = project._id;
      meetingBody.createdBy = userID;
      meetingBody.modifiedBy = userID;

      // enter here one default theme

      // enter here one defualt agenda

      const meeting = new Meeting(meetingBody);
      await meeting.save();

      return res.status(200).send(meeting);
    }

    // check if parent ID is valid
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// this is for all meetings of the user
router.get('/meeting/:projectURL/:meetingID', auth, async (req, res) => {
  try {
    const meetingID = req.params.meetingID;
    const projectURL = req.params.projectURL;

    if (!meetingID || !projectURL) throw new Error('Missing parameters');

    const project = await Project.findOne({ url: projectURL });

    const meeting = await Meeting.findOne({
      _id: meetingID,
      project: project._id,
    });

    // console.log(meeting);

    const userStatusInProject = await checkProjectAllowedSingleUser(
      req.user._id,
      meeting.project
    );

    if (userStatusInProject === 0) {
      throw new Error('Meeting not found');
    } else if (userStatusInProject === 2 || userStatusInProject === 1) {
      let agendas;
      if (
        !meeting.hasOwnProperty('continuingMeeting') ||
        meeting.continuingMeeting == ''
      ) {
        agendas = await meeting.populate('agendas').execPopulate();
      } else {
        const meetingSecond = await Meeting.findById(meeting.continuingMeeting);
        agendas = await meetingSecond.populate('agendas').execPopulate();
      }

      res.status(200).send({
        meeting: meeting,
        agendas: agendas,
      });
    } else {
      return res
        .status(200)
        .send(
          'User not allowed to enter an meeting. Please contact a Project Manager of this project.'
        );
    }
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.patch('/meeting/:projectURL/:meetingID', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const userID = req.user._id;
  const allowedUpdates = [
    'name',
    'description',
    'date',
    'location',
    'attendees',
    'chair',
  ];

  try {
    const isValidOperation = await updates.every((update) => {
      // I added await because not sure
      return allowedUpdates.includes(update);
    });
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }
    if (updates.includes('theme') && updates.length > 1) {
      throw new Error('When changing  the theme, only one input allowed.');
    }

    const meetingID = req.params.meetingID;
    const projectURL = req.params.projectURL;
    const project = await Project.findOne({ url: projectURL });

    if (!project) throw new Error('Wrong project url');
    //
    const userStatusInProject = checkProjectAllowedFromArray(
      project.users,
      req.user._id
    );
    const meeting = await Meeting.findOne({
      _id: meetingID,
      project: project._id,
    });
    if (!meeting) throw new Error('Wrong meeting url');

    if (userStatusInProject === 0) {
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      return res
        .status(200)
        .send(
          'User not allowed to edit a meeting. Please ask one of the project managers.'
        );
    } else {
      const existingMeeting = JSON.parse(JSON.stringify(meeting));
      const historyElement = {
        dateMod: new Date(),
        modifiedBy: req.user._id,
        updates: [],
      };
      let updateElement = {};

      let i = 0;
      let stepFlagDate = 0;
      let update;
      let meetingArray;
      let k = 0;

      for (let j = 0; j < updates.length; j++) {
        update = updates[j];
        meeting[update] = req.body[update];
        updateElement.fieldMod = update.toString();
        updateElement.pastVal = existingMeeting[update].toString();
        updateElement.newVal = req.body[update].toString();

        if (update === 'attendees') {
          updateElement.pastVal = JSON.stringify(existingMeeting[update]);
          updateElement.newVal = JSON.stringify(req.body[update]);
        }

        historyElement.updates[i] = updateElement;

        i = i + 1;
        updateElement = {};
      }

      meeting.modifiedBy = req.user._id;
      meeting.history.push(historyElement);
      await meeting.save();
    }

    res.status(200).send(meeting);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
