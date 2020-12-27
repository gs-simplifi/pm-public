const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const validator = require('validator');
// const checkUserInCompany = require('../functions/checkUserInCompany'); // is it redundant, if I am already checking if user is to theme, and relevant rights.

const themeSchema = new mongoose.Schema(
  {
    // Theme automatically gets stored in collection themes
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
    parentID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ThemeGroup',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sNo: {
      type: Number,
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

// themeSchema.virtual('themestats', {
//   ref: 'ThemeStat',
//   localField: '_id',
//   foreignField: 'theme',
// });

themeSchema.pre('save', async function (next) {
  const theme = this;

  console.log('Just before saving Theme');
  this.increment();
  next();
});

themeSchema.pre('remove', async function (next) {});

const Theme = mongoose.model('Theme', themeSchema);

module.exports = Theme;
