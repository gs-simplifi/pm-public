const express = require('express');
const path = require('path');
const router = new express.Router();
const User = require('../models/user');
const Client = require('../models/client');
const auth = require('../middleware/auth');
const { compare } = require('bcryptjs');
const checkInitials = require('../functions/checkInitials');
// const mongoose = require('mongoose');

const PolicyDate = require('../models/policyDate');
const { ObjectID } = require('mongodb');
// const checkDomain = require('../functions/checkDomain');
// const { sendWelcomeEmail, sendCancelEmail } = require('../emails/account');

router.post('/users/admin/new', async (req, res) => {
  const user = new User(req.body);

  try {
    console.log(req.body);

    // const email = req.body.email;
    // const companyID = req.body.client;
    // const client = await Client.findById(companyID);
    // const domains = client.allowedDomains;
    // //Check 1: email is part of domain
    // const flag = checkDomain(domains, email);
    // if (!flag) {
    //   return res.send('User emal is not part of domain');
    // }

    //Check 2: initials is unique to company //@follow-up
    const flag = await checkInitials(req.body.initials, req.body.client);

    if (flag) {
      return res.send('Initals already exist in the comapny');
    }

    await user.save();
    console.log('User created');
    res.send('User Created');

    // res.sendFile(path.resolve(__dirname, '..', '..', 'public', 'private.html'));
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/users/login', async (req, res) => {
  // check for change password flag
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await user.generateAuthToken();
    res.cookie('auth_token', token);
    res.cookie('client', user.client);

    // check change password
    if (user.changePassword) {
      console.log('User has to change password'); // get to change password screen
    }
    // Check polcy, cookie
    const policyDateLatest = await PolicyDate.findOne({}).sort({
      datePrivacyPolicy: -1,
    });
    const cookieDateLatest = await PolicyDate.findOne({}).sort({
      dateCookiePolicy: -1,
    });
    if (policyDateLatest.datePrivacyPolicy > user.datePrivacyPolicy) {
      console.log('User has to sign privacy policy'); // do here for Privacy Policy
    }

    if (cookieDateLatest.dateCookiePolicy > user.dateCookie) {
      console.log('User has to sign cookie policy'); // do here for Cookie Policy
    }

    res.send('User Logged in');
    // res.sendFile(path.resolve(__dirname, '..', '..', 'public', 'private.html'));
  } catch (e) {
    res.status(400).send();
  }
});

router.post('/users/new', auth, async (req, res) => {
  const user = new User(req.body);

  try {
    // console.log(req.user);

    // check user type 1
    if (req.user.type !== 1) {
      return res.status(200).send('No rights to create user');
    }

    // check auth within company
    if (req.user.client.toString() !== req.body.client) {
      return res.status(200).send('Comapny Mismatch');
    }

    const flag = await checkInitials(req.body.initials, req.body.client);

    if (flag) {
      return res.status(200).send('Initals already exist in the comapny');
    }

    await user.save();
    console.log('User created');
    res.send('User Created');
  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.cookie('client', '');
    res.cookie('auth_token', '');
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

router.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.cookie('client', '');
    res.cookie('auth_token', '');
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

router.get('/users/:id', auth, async (req, res) => {
  // check if it is for me.

  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(200).send(req.user);
    } else {
      const otherUser = await User.findOne({
        _id: req.params.id,
        client: req.user.client,
      });
      if (!otherUser) {
        throw new Error('User not found, or user not authorized');
      }
      return res.status(200).send(otherUser);
    }
  } catch (e) {
    res.status(500).send();
  }
});

// ***************************************************************** to do from here
router.patch('/users/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'name',
    'email',
    'password',
    'initials',
    'type',
    'client',
    'changePassword',
    'datePrivacyPolicy',
    'dateCookie',
    'department',
  ];
  const isValidOperation = updates.every((update) => {
    return allowedUpdates.includes(update);
  });
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates' });
  }
  var flag = 0;
  try {
    if (req.params.id === req.user._id.toString()) {
      console.log('User is me');
      flag = 1;
    } else {
      const client = await Client.findById(req.user.client);
      if (req.user.email === client.adminUser) {
        const otherUser = await User.findOne({
          _id: req.params.id,
          client: req.user.client,
        });
        if (!otherUser) {
          throw new Error('User not found, or user not authorized');
        }
        flag = 1;
      } else {
        throw new Error('User not found, or user not authorized');
      }
    }
    // console.log(updates);
    if (updates.includes('initials')) {
      // console.log('Yes. Has initials');
      const flag2 = await checkInitials(req.body.initials, req.user.client);
      if (flag2) {
        // console.log('Initials already present - PLEASEEEEE');
        throw new Error('Initials present');
      }
    }

    if (flag) {
      updates.forEach((update) => {
        req.user[update] = req.body[update];
      });
      await req.user.save();
      res.send(req.user);
    } else {
      // console.log('There was some error.');
      throw new Error('There was some error');
    }
  } catch (e) {
    res.status(200).send('It was here');
  }
});

// router.delete('/users/me', auth, async (req, res) => {
//   try {
//     // console.log(req.params.id);
//     // _id = req.params.id;
//     // const user = await User.findByIdAndDelete(req.user._id);
//     // if (!user) {
//     //   return res.status(404).send('User not found');
//     // }

//     await req.user.remove();
//     sendCancelEmail(req.user.email, req.user.name);
//     res.send(req.user);
//   } catch (e) {
//     res.status(400).send(e);
//   }
// });

module.exports = router;
