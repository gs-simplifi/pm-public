const checkDomain = (domains, email) => {
  if (domains !== undefined) {
    let flag = false;

    for (let i = 0; i < domains.length; i++) {
      let result = email.search(`@${domains[i]}`);
      if (result !== -1) {
        flag = true;
      }
    }
    if (!flag) {
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
};

module.exports = checkDomain;
