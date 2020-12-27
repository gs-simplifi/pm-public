const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const validator = require('validator');
const Theme = require('./theme');
const Project = require('../models/project');
const Client = require('../models/client');

const actionSchema = new mongoose.Schema(
  {
    // Action automatically gets stored in collection actions
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Project',
    },
    theme: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Theme',
    },
    riskPriority: {
      name: {
        type: String,
        default: 'Default',
        maxlength: 10,
      },
      weight: {
        type: Number,
        default: 1,
      },
    },
    completion: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    sNoInTheme: {
      type: Number,
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

actionSchema.virtual('tacticalsteps', {
  ref: 'TacticalStep',
  localField: '_id',
  foreignField: 'action',
});

actionSchema.pre('save', async function (next) {
  const action = this;
  if (action.isModified('theme')) {
    // console.log('Here 3a');
    const themeInProject = await Theme.find({
      _id: action.theme,
      project: action.project,
    });
    // console.log(themeInProject.length);
    if (themeInProject.length !== 1) {
      throw new Error('User not authorized, or theme not part of the project');
    }
  }

  if (action.isModified('date')) {
    const projectDateObj = await Project.findById(action.project).select(
      'date'
    );

    const projectDate = projectDateObj.date;
    const actionStartDate = new Date(action.date.start);
    const actionEndDate = new Date(action.date.end);

    if (
      actionStartDate < projectDate.start ||
      actionEndDate > projectDate.end ||
      actionStartDate > actionEndDate
    ) {
      throw new Error(
        'Action dates breach Project Dates. Please compare against project dates.'
      );
    }
  }

  if (action.isModified('riskPriority')) {
    //check if risk priority is part of client, and read rating
    const projectClientObj = await Project.findById(action.project).select(
      'client'
    );
    console.log(projectClientObj);
    const clientRiskPriorityObject = await Client.findById(
      projectClientObj.client
    ).select('riskPriority');
    const clientRiskPriority = clientRiskPriorityObject.riskPriority;
    // console.log(clientRiskPriority, typeof clientRiskPriority);
    const search = action.riskPriority.name;

    let flag = 0;

    clientRiskPriority.forEach((element) => {
      if (element.name === search) {
        flag = 1;
        action.riskPriority.weight = element.weight;
      }
    });

    if (!flag)
      throw new Error('THe risk category does not belong to this client.');
  }

  console.log('Just before saving Action');
  this.increment();
  next();
});

actionSchema.pre('remove', async function (next) {
  next();
});

const Action = mongoose.model('Action', actionSchema);

module.exports = Action;
