const express = require('express');
const { ObjectId } = require('mongodb');
const path = require('path');
const router = new express.Router();
const Agenda = require('../models/agenda');
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
const Meeting = require('../models/meeting');

router.post('/agenda/:meetingID/new', auth, async (req, res) => {
  const meetingID = req.params.meetingID;
  const agendaBody = req.body;
  const userID = req.user._id;
  // const projectURL = req.params.projectURL;

  try {
    if (!meetingID) throw new Error('No meeting entered');

    const meeting = await Meeting.findById(meetingID);

    if (!meeting) throw new Error('No meeting found');

    // console.log(agenda);

    const userStatusInProject = await checkProjectAllowedSingleUser(
      req.user._id,
      meeting.project
    );
    if (userStatusInProject === 0) {
      // console.log('Here 1');
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      // console.log('Here 2');
      return res
        .status(200)
        .send(
          'User not allowed to enter a agenda. Please contact a Project Manager of this project.'
        );
    } else {
      // console.log('Here 3');
      agendaBody.createdBy = userID;
      agendaBody.modifiedBy = userID;
      agendaBody.meeting = meeting._id;
      agendaBody.sNo = -1;

      let agendaArray;
      agendaArray = await Agenda.find({ meeting: meetingID });

      // console.log(agendaArray);
      await updateSerialNo({
        modelName: 'agenda',
        sNoName: 'sNo',
        updateArray: agendaArray,
        updateBody: agendaBody,
        type: 'new',
        previosuSerial: '',
      });

      const agenda = new Agenda(agendaBody);
      await agenda.save();

      return res.status(200).send(agenda);
    }

    // check if parent ID is valid
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// this is for all agendas of the user
router.get('/agenda/:meetingID/:agendaID', auth, async (req, res) => {
  try {
    const meetingID = req.params.meetingID;
    const userID = req.user._id;
    const agendaID = req.params.agendaID;

    if (!agendaID || !meetingID) throw new Error('Missing parameters');

    const meeting = await Meeting.findById(meetingID);
    if (!meeting) throw new Error('No meeting found');

    const userStatusInProject = await checkProjectAllowedSingleUser(
      req.user._id,
      meeting.project
    );

    if (userStatusInProject === 0) {
      throw new Error('Agenda not found');
    } else if (userStatusInProject === 2 || userStatusInProject === 1) {
      const agenda = await Agenda.findById(agendaID);
      if (!agenda) throw new Error('Agenda not found');
      res.status(200).send(agenda);
    } else {
      return res
        .status(200)
        .send(
          'User not allowed to enter an agenda. Please contact a Project Manager of this project.'
        );
    }
  } catch (e) {
    res.status(400).send(e.message);
  }
});

router.patch('/agenda/:meetingID/:agendaID', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const meetingID = req.params.meetingID;
  const userID = req.user._id;
  const agendaID = req.params.agendaID;
  const allowedUpdates = [
    'name',
    'description',
    'status',
    'sNo',
    'relatedActions',
  ];

  try {
    const isValidOperation = await updates.every((update) => {
      // I added await because not sure
      return allowedUpdates.includes(update);
    });
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }
    if (!agendaID || !meetingID) throw new Error('Missing parameters');

    const meeting = await Meeting.findById(meetingID);
    if (!meeting) throw new Error('No meeting found');

    const userStatusInProject = await checkProjectAllowedSingleUser(
      req.user._id,
      meeting.project
    );
    const agenda = await Agenda.findOne({
      _id: agendaID,
    });
    if (!agenda) throw new Error('Agenda not found');

    if (userStatusInProject === 0) {
      throw new Error('Project not found');
    } else if (userStatusInProject === 2) {
      return res
        .status(200)
        .send(
          'User not allowed to edit a agenda. Please ask one of the project managers.'
        );
    } else {
      const existingAgenda = JSON.parse(JSON.stringify(agenda));
      console.log(existingAgenda);
      const historyElement = {
        dateMod: new Date(),
        modifiedBy: req.user._id,
        updates: [],
      };
      let updateElement = {};

      let i = 0;
      let stepFlagDate = 0;
      let update;
      let agendaArray;
      let k = 0;

      for (let j = 0; j < updates.length; j++) {
        update = updates[j];
        agenda[update] = req.body[update];
        updateElement.fieldMod = update.toString();
        updateElement.pastVal = existingAgenda[update].toString();
        updateElement.newVal = req.body[update].toString();

        if (update === 'sNo') {
          let agendaArray;
          agendaArray = await Agenda.find({ meeting: meetingID });
          await updateSerialNo({
            modelName: 'agenda',
            sNoName: 'sNo',
            updateArray: agendaArray,
            updateBody: agenda,
            type: 'update',
            previosuSerial: existingAgenda.sNo,
          });
          updateElement.newVal = agenda[update];
        }

        if (update === 'relatedActions') {
          updateElement.pastVal = JSON.stringify(
            existingAgenda[update].join('-')
          );
          updateElement.newVal = JSON.stringify(req.body[update].join('-'));
        }

        historyElement.updates[i] = updateElement;

        i = i + 1;
        updateElement = {};
      }

      agenda.modifiedBy = req.user._id;
      agenda.history.push(historyElement);
      await agenda.save();
    }

    res.status(200).send(agenda);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

module.exports = router;
