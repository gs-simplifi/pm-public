const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Client = require('../models/client');

const checkDomain = require('../functions/checkDomain');
const checkDepartments = require('../functions/checkDepartments');

const userSchema = new mongoose.Schema(
  {
    // User automatically gets stored in collection users
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
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
    password: {
      type: String,
      required: true,
      minLength: 6,
      trim: true,
      validate(value) {
        if (value.toLowerCase().includes('password')) {
          throw new Error('Password cannot contain password');
        }
      },
    },
    initials: {
      type: String,
      required: true,
    },
    type: {
      type: Number,
      default: 2,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Client',
    },
    changePassword: {
      type: Boolean,
      default: true,
    },
    datePrivacyPolicy: {
      type: Date,
      default: '01/01/1970',
    },
    dateCookie: {
      type: Date,
      default: '01/01/1970',
    },
    department: {
      type: String,
      default: 'Default',
    },
    projects: [
      {
        project: {
          id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Project',
          },
          assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
          },
          assignedOn: {
            type: Date,
          },
        },
      },
    ],
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAuthToken = async function () {
  const user = this;

  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  // console.log(user);
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

// userSchema.virtual('tasks', {
//   ref: 'Task',
//   localField: '_id',
//   foreignField: 'owner',
// });

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;

  return userObject;
};

// userSchema.methods.getPublicProfile = function () {
//   const user = this;
//   const userObject = user.toObject();
//   console.log(userObject);

//   delete userObject.password;
//   delete userObject.tokens;

//   console.log(userObject);
//   return userObject;
// };

userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    // console.log('Unable to login, user not found');
    return new Error('Unable to login, user not found');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    console.log('Unable to login, password not found');
    throw new Error('Unable to login, password');
  }

  return user;
};

userSchema.statics.findByClient = async (userID, companyID) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    // console.log('Unable to login, user not found');
    return new Error('Unable to login, user not found');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    console.log('Unable to login, password not found');
    throw new Error('Unable to login, password');
  }

  return user;
};

// Hash the plain text password without saving
userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('email')) {
    const email = user.email;
    const companyID = user.client;
    const client = await Client.findById(companyID);
    const domains = client.allowedDomains;
    //Check 1: email is part of domain
    const flag = checkDomain(domains, email);
    console.log('Here 1');
    if (!flag) {
      throw new Error('User emal is not part of domain');
    }
  }

  if (user.isModified('department')) {
    const deparment = user.department;
    const companyID = user.client;
    const client = await Client.findById(companyID);
    const departments = client.departments;
    //Check 1: email is part of domain
    const flag = checkDepartments(departments, deparment);
    // console.log('Here 1');
    if (!flag) {
      console.log('Department does not exist');
      throw new Error('Department does not exist');
    }
  }

  console.log('Just before saving');
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }

  next();
});

//Delete user tasks when user is removed
userSchema.pre('remove', async function (next) {
  const user = this;
  await Task.deleteMany({ owner: user._id });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
