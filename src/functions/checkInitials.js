const User = require('../models/user');

const checkInitials = async (initials, companyID) => {
  //   console.log('Here 2', initials, companyID);
  const usersWithInitials = await User.find({
    client: companyID,
    initials: initials,
  });
  //   console.log(usersWithInitials.length);
  return usersWithInitials.length ? true : false;
};

module.exports = checkInitials;
