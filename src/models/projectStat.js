const mongoose = require('mongoose');
const validator = require('validator');

const projectStatSchema = new mongoose.Schema(
  {
    // ProjectStat automatically gets stored in collection projectStats

    project: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Project',
    },
    statusUpdate: [
      {
        name: {
          type: String,
          default: 'Default Update',
        },
        totalActionItems: {
          type: Number,
          required: true,
        },
        closedActionItems: {
          type: Number,
          required: true,
        },
        totalRiskScore: {
          type: Number,
          required: true,
        },
        closedRiskScore: {
          type: Number,
          required: true,
        },
        percentActionComplete: {
          type: Number,
          default: 0,
          min: 0,
          max: 1,
        },
        percentRiskComplete: {
          type: Number,
          default: 0,
          min: 0,
          max: 1,
        },
        dueToActionname: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TacticalStep',
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'User',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

projectStatSchema.pre('save', async function (next) {
  const projectStat = this;

  const statusUpdate = projectStat.statusUpdate;
  if (!statusUpdate.length) {
    throw new Error('Status Update cannot be empty');
  }
  const lastElement = statusUpdate[statusUpdate.length - 1];
  if (lastElement.totalActionItems === 0) {
    lastElement.percentActionComplete = 0;
  } else {
    lastElement.percentActionComplete =
      lastElement.closedActionItems / lastElement.totalActionItems;
  }
  if (lastElement.totalRiskScore === 0) {
    lastElement.percentRiskComplete = 0;
  } else {
    lastElement.percentRiskComplete =
      lastElement.closedRiskScore / lastElement.totalRiskScore;
  }

  projectStat.statusUpdate[statusUpdate.length - 1].percentActionComplete =
    lastElement.percentActionComplete;
  projectStat.statusUpdate[statusUpdate.length - 1].percentRiskComplete =
    lastElement.percentRiskComplete;

  next();
});

const ProjectStat = mongoose.model('ProjectStat', projectStatSchema);

module.exports = ProjectStat;
