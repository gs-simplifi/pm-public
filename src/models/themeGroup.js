const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const validator = require('validator');

const projectGroupSchema = new mongoose.Schema(
  {
    // ThemeGroup automatically gets stored in collection projectGroups
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Project',
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

projectGroupSchema.virtual('themes', {
  ref: 'ThemeGroup',
  localField: '_id',
  foreignField: 'parentID',
});

projectGroupSchema.pre('save', async function (next) {
  console.log('Just before saving ThemeGroup');

  this.increment();
  next();
});

projectGroupSchema.pre('remove', async function (next) {
  next();
});

const ThemeGroup = mongoose.model('ThemeGroup', projectGroupSchema);

module.exports = ThemeGroup;
