const express = require('express');
const path = require('path');
const router = new express.Router();
const Client = require('../models/client');
const checkDomain = require('../functions/checkDomain');

router.post('/client/new', async (req, res) => {
  const client = new Client(req.body);

  try {
    console.log(req.body);
    // check email is part of domain

    const flag = checkDomain(req.body.allowedDomains, req.body.adminUser);
    if (!flag) {
      return res.send('User emal is not part of domain');
    }

    if (!req.body.riskPriority) {
      client.riskPriority = { name: 'Default', weight: 1 };
    }

    await client.save();
    res.cookie('client', req.body.url);
    // console.log(token);
    console.log('Client created');
    return res.send('Client created');
    // res.sendFile(path.resolve(__dirname, '..', '..', 'public', 'private.html'));
  } catch (e) {
    res.status(400).send(e);
  }
});

// this is for all client
// router.get('/client', auth, async (req, res) => {
//   try {
//     const client = await Client.find({});
//     res.status(201).send(client);
//   } catch (e) {
//     res.status(400).send(e.message);
//   }
// });

// this is for me
// router.get('/client/me', async (req, res) => {
//   // res.send(req.client);
// });

// router.get('/:id', async (req, res) => {
//   const _id = req.params.id;

//   try {
//     const client = await Client.findById(_id);
//     if (!client) {
//       return res.status(404).send('client not found');
//     }
//     res.status(201).send(client);
//   } catch (e) {
//     res.status(400).send(e.message);
//   }
// });

module.exports = router;
