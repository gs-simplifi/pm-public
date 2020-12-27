const express = require('express');
const path = require('path');
const router = new express.Router();
const ProjectStat = require('../models/projectStat');
const auth = require('../middleware/auth');
// const checkDomain = require('../functions/checkDomain');

router.post('/projectStat/new', auth, async (req, res) => {
  const projectStat = new ProjectStat(req.body);

  try {
    await projectStat.save();
    return res.status(200).send(projectStat);
  } catch (e) {
    res.status(400).send(e);
  }
});

module.exports = router;
