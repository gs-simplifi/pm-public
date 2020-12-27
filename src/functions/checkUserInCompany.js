const { ObjectID } = require('mongodb');
const User = require('../models/user');

const checkUserInCompany = async (user, companyID) => {
  const userFound = await User.find({
    client: companyID,
    _id: user,
  });
  // console.log(userFound);
  return userFound.length ? true : false;
};

module.exports = checkUserInCompany;
