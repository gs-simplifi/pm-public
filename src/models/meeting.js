const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const validator = require('validator');

const meetingSchema = new mongoose.Schema(
  {
    // Meeting automatically gets stored in collection meetings
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Project',
    },
    meetingTheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theme',
    },
    continuingMeeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
    },
    chair: {
      type: String,
    },
    attendees: [
      {
        name: {
          type: String,
        },
        attended: {
          type: Boolean,
        },
        notes: {
          type: String,
        },
      },
    ],
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

meetingSchema.virtual('agendas', {
  ref: 'Agenda',
  localField: '_id',
  foreignField: 'meeting',
});

meetingSchema.pre('save', async function (next) {
  const meeting = this;
  console.log('Just before saving Meeting');
  this.increment();
  next();
});

meetingSchema.pre('remove', async function (next) {
  next();
});

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
