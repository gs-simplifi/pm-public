const checkDepartments = (departments, department) => {
  if (departments !== undefined) {
    let flag = false;

    const result = departments.includes(department);
    return result;
  } else {
    return false;
  }
};

module.exports = checkDepartments;
