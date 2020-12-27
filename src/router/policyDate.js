const express = require('express');
const path = require('path');
const router = new express.Router();
const PolicyDate = require('../models/policyDate');

router.post('/policyDate/new', async (req, res) => {
  const policyDate = new PolicyDate(req.body);

  try {
    console.log(req.body);

    await policyDate.save();
    return res.send('PolicyDate created');
  } catch (e) {
    res.status(400).send(e);
  }
});

module.exports = router;
