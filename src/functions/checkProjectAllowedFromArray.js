const checkProjectAllowedFromArray = (users, id) => {
  if (users !== undefined) {
    let isVisible = 0;
    if (users.projectManagers.includes(id)) return (isVisible = 1);
    if (users.projectContributors.includes(id)) return (isVisible = 2);

    return isVisible;
  } else {
    return 0;
  }
};

module.exports = checkProjectAllowedFromArray;
