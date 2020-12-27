const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const validator = require('validator');
const checkUserInCompany = require('../functions/checkUserInCompany'); // is it redundant, if I am already checking if user is to project, and relevant rights.
const checkProjectAllowedFromArray = require('../functions/checkProjectAllowedFromArray');
const ProjectGroup = require('../models/projectGroup');

const projectSchema = new mongoose.Schema(
  {
    // Project automatically gets stored in collection projects
    name: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      trim: true,
      unique: true,
      required: true,
      lowercase: true,
      minlength: 4,
      maxlength: 30,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Client',
    },
    date: {
      start: {
        type: Date,
        default: '01/01/2020',
      },
      end: {
        type: Date,
        default: '02/01/2020',
      },
    },
    users: {
      projectManagers: {
        type: [String],
      },
      projectContributors: {
        type: [String],
      },
    },

    parentID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectGroup',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    history: [
      {
        dateMod: {
          type: Date,
        },
        modifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        modifiedByInitials: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        updates: [
          {
            fieldMod: {
              type: String,
            },
            pastVal: {
              type: String,
            },
            newVal: {
              type: String,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

projectSchema.virtual('projectstats', {
  ref: 'ProjectStat',
  localField: '_id',
  foreignField: 'project',
});
projectSchema.virtual('actions', {
  ref: 'Action',
  localField: '_id',
  foreignField: 'project',
});

projectSchema.virtual('themes', {
  ref: 'Theme',
  localField: '_id',
  foreignField: 'project',
});

projectSchema.statics.findByURL = async (url, id) => {
  const project = await Project.findOne({ url });
  const isVisible = checkProjectAllowedFromArray(project.users, id);
  if (!isVisible) {
    throw new Error('Project not found');
  }
  return project;
};
projectSchema.statics.findOnlyURL = async (url) => {
  const project = await Project.findOne({ url });
  if (project) {
    return true;
  } else return false;
};

// userSchema.virtual('tasks', {
//   // ref: 'Task',
//   // localField: '_id',
//   // foreignField: 'owner',
//   // *********** To build for sub categories
// });

// projectSchema.statics.findByID = async (_id) => {
//   const project = await Project.findOne({ _id });
//   return project;
// };

//Delete project tasks when project is removed

projectSchema.pre('save', async function (next) {
  const project = this;
  if (project.isModified('url')) {
    const url = project.url;
    if (/\s/g.test(url)) {
      console.log('found error');
      throw new Error('URL cannot contain white space');
    }
    const projectGroups = await ProjectGroup.find({ url: url });
    if (projectGroups.length > 0) {
      console.log('reahed here');
      throw new Error(
        'URL matches with atleast one other project or project group'
      );
    }
  }
  if (project.isModified('users')) {
    const users = project.users;
    if (!users.projectManagers.length) {
      console.log('found error no pm');
      throw new Error('Atlease one Project Manager should be present');
    }
  }
  if (project.isModified('date')) {
    const date = project.date;
    if (date.start >= date.end) {
      console.log('found error bad dates');
      throw new Error(
        'Please check start and end dates. End date should be later than start date'
      );
    }
  }

  // ****************** the below error handler did not work because of stacked errors
  if (project.isModified('users')) {
    const users = project.users;
    const companyID = project.client.toString();

    const projectManagers = await users.projectManagers;
    // console.log(projectManagers);

    let flag = 1;
    console.log(companyID, typeof companyID);

    for (let i = 0; i < projectManagers.length; i++) {
      flag = await checkUserInCompany(projectManagers[i], companyID);
      console.log(flag);
    }

    const projectContributors = await users.projectContributors;
    console.log(projectContributors.length);

    for (let i = 0; i < projectContributors.length; i++) {
      flag = await checkUserInCompany(projectContributors[i], companyID);
      console.log(flag);
    }

    if (!flag) {
      console.log('It was at error');
      throw new Error('User does not exist or is not part of this company');
    }
  }

  if (project.isModified('department')) {
    // const deparment = user.department;
    // const companyID = user.client;
    // const client = await Client.findById(companyID);
    // const departments = client.departments;
    // //Check 1: email is part of domain
    // const flag = checkDepartments(departments, deparment);
    // // console.log('Here 1');
    // if (!flag) {
    //   console.log('Department does not exist');
    //   throw new Error('Department does not exist');
    // }
  }

  console.log('Just before saving Project');
  this.increment();
  next();
});

projectSchema.pre('remove', async function (next) {
  // const project = this;
  // await Task.deleteMany({ owner: project._id });
  // next();
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
