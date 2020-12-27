const mongoose = require('mongoose');
const validator = require('validator');

const clientSchema = new mongoose.Schema(
  {
    // Client automatically gets stored in collection clients
    name: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      unique: true,
      trim: true,
      required: true,
      lowercase: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    adminUser: {
      type: String,
      unique: true,
      trim: true,
      required: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid emails');
        }
      },
    },
    allowedDomains: {
      type: Array,
      required: true,
    },
    departments: {
      type: Array,
      default: ['Defualt'],
    },
    riskPriority: [
      {
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
    ],
  },
  {
    timestamps: true,
  }
);

clientSchema.statics.findByURL = async (url) => {
  const client = await Client.findOne({ url });
  return client;
};

// clientSchema.statics.findByID = async (_id) => {
//   const client = await Client.findOne({ _id });
//   return client;
// };

//Delete client tasks when client is removed
clientSchema.pre('remove', async function (next) {
  // const client = this;
  // await Task.deleteMany({ owner: client._id });
  // next();
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
