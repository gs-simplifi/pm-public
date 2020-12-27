const mongoose = require('mongoose');
const validator = require('validator');

const policyDateSchema = new mongoose.Schema(
  {
    // PolicyDate automatically gets stored in collection policyDates
    datePrivacyPolicy: {
      type: Date,
      default: '01/01/2020',
    },
    dateCookiePolicy: {
      type: Date,
      default: '01/01/2020',
    },
  },
  {
    timestamps: true,
  }
);

const PolicyDate = mongoose.model('PolicyDate', policyDateSchema);

module.exports = PolicyDate;
