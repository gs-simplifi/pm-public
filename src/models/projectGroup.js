const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const validator = require('validator');

const Project = require('./project');
// const ProjectGroupStat = require('../models/projectGroupStat');

const projectGroupSchema = new mongoose.Schema(
  {
    // ProjectGroup automatically gets stored in collection projectGroups
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

projectGroupSchema.virtual('projects', {
  ref: 'ProjectGroup',
  localField: '_id',
  foreignField: 'parentID',
});

// projectGroupSchema.statics.findByURL = async (url, id) => {
//   const projectGroup = await ProjectGroup.findOne({ url });
//   const isVisible = checkProjectGroupAllowedFromArray(projectGroup.users, id);
//   if (!isVisible) {
//     throw new Error('ProjectGroup not found');
//   }
//   return projectGroup;
// };

projectGroupSchema.pre('save', async function (next) {
  console.log('Just before saving ProjectGroup');
  const prjectGroup = this;

  if (prjectGroup.isModified('url')) {
    // console.log('1 a');
    const url = prjectGroup.url;
    if (/\s/g.test(url)) {
      console.log('found error');
      throw new Error('URL cannot contain white space');
    }
    // console.log('1 b');
    // const projectsSame = await Project.find({ url: url });
    // if (projectsSame.length > 0) {
    //   console.log('1 c');
    //   throw new Error(
    //     'URL matches with atleast one other project or project group'
    //   );
    // }
  }

  this.increment();
  next();
});

projectGroupSchema.pre('remove', async function (next) {
  next();
});

const ProjectGroup = mongoose.model('ProjectGroup', projectGroupSchema);

module.exports = ProjectGroup;
