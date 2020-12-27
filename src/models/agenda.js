const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const validator = require('validator');

const agendaSchema = new mongoose.Schema(
  {
    // Agenda automatically gets stored in collection agendas
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Meeting',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
    },
    sNo: {
      type: Number,
    },
    relatedActions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'action' }],

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

agendaSchema.pre('save', async function (next) {
  const agenda = this;
  console.log('Just before saving Agenda');
  this.increment();
  next();
});

agendaSchema.pre('remove', async function (next) {
  next();
});

const Agenda = mongoose.model('Agenda', agendaSchema);

module.exports = Agenda;
