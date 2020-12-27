const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const validator = require('validator');
const Action = require('./action');
const Project = require('./project');
const Client = require('./client');

const tacticalStepSchema = new mongoose.Schema(
  {
    // TacticalStep automatically gets stored in collection tacticalSteps
    detail: {
      type: String,
      required: true,
      trim: true,
    },
    discussionNotes: {
      type: String,
      trim: true,
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
    sNoInAction: {
      type: Number,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Project',
    },
    action: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Action',
    },
    riskPriorityName: {
      type: String,
      default: 'Default',
      maxlength: 10,
    },
    riskPriorityWeight: {
      type: Number,
      default: 1,
    },

    completion: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    start: {
      type: Date,
      default: '01/01/2020',
    },
    end: {
      type: Date,
      default: '02/01/2020',
    },
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// tacticalStepSchema.virtual('tacticalStepstats', {
//   ref: 'TacticalStepStat',
//   localField: '_id',
//   foreignField: 'tacticalStep',
// });

tacticalStepSchema.pre('save', async function (next) {
  const tacticalStep = this;
  // if (tacticalStep.isModified('theme')) {
  //   // console.log('Here 3a');
  //   const themeInProject = await Theme.find({
  //     _id: tacticalStep.theme,
  //     project: tacticalStep.project,
  //   });
  //   // console.log(themeInProject.length);
  //   if (themeInProject.length !== 1) {
  //     throw new Error('User not authorized, or theme not part of the project');
  //   }
  // }

  if (tacticalStep.isModified('riskPriority')) {
    //check if risk priority is part of it, and read rating
    // const projectClientObj = await Project.findById(
    //   tacticalStep.project
    // ).select('client');
    // console.log(projectClientObj);
    // const clientRiskPriorityObject = await Client.findById(
    //   projectClientObj.client
    // ).select('riskPriority');
    // const clientRiskPriority = clientRiskPriorityObject.riskPriority;
    // // console.log(clientRiskPriority, typeof clientRiskPriority);
    // const search = tacticalStep.riskPriority.name;

    // let flag = 0;

    // clientRiskPriority.forEach((element) => {
    //   if (element.name === search) {
    //     flag = 1;
    //     tacticalStep.riskPriority.weight = element.weight;
    //   }
    // });

    if (!flag)
      throw new Error('THe risk category does not belong to this client.');
  }

  // console.log('Just before saving TacticalStep');
  this.increment();
  next();
});

tacticalStepSchema.pre('remove', async function (next) {
  next();
});

const TacticalStep = mongoose.model('TacticalStep', tacticalStepSchema);

module.exports = TacticalStep;
