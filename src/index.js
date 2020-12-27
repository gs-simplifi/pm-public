const express = require('express');
const hbs = require('hbs');
const path = require('path');
const cookieParser = require('cookie-parser');

require('./db/mongoose');
const clientRouter = require('./router/client');
const userRouter = require('./router/user');
const policyDateRouter = require('./router/policyDate');
const projectRouter = require('./router/project');
const projectGroupRouter = require('./router/projectGroup');
const projectStatRouter = require('./router/projectStat'); // for testing only. to be removed

const themeRouter = require('./router/theme');
const themeGroupRouter = require('./router/themeGroup');
const actionRouter = require('./router/action');
const tacticalStepRouter = require('./router/tacticalStep');
const meetingRouter = require('./router/meeting');
const agendaRouter = require('./router/agenda');

const { ObjectId } = require('mongodb');
// const ObjectId = require('mongoose').Types.ObjectId;

app = express();

app.use((req, res, next) => {
  if (process.env.MAINT_STATUS == 1) {
    res.status(503).send('Server is under maintenance');
    console.log('Entered maintenance');
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const viewsPath = path.join(__dirname, '../templates/views');
const partialsPath = path.join(__dirname, '../templates/partials');
app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);
app.use(express.static(path.join(__dirname, '..', 'public'))); // set up static directory to serve

app.get('', (req, res) => {});

app.use(policyDateRouter);
app.use(clientRouter);
app.use(userRouter);
app.use(projectRouter);
app.use(projectGroupRouter);
app.use(projectStatRouter); // for testing only. to be removed

app.use(themeRouter);
app.use(themeGroupRouter);
app.use(actionRouter);
app.use(tacticalStepRouter);
app.use(meetingRouter);
app.use(agendaRouter);

app.listen(process.env.PORT, () => {
  console.log(`App running on port ${process.env.PORT}`);
});

// *************************

// const user = '5fdb162183294e68a0830891';
// const companyID = '5fdaf9e488d7ed1cf8fe6856';
// const flag = checkUserInCompany(ObjectId(user), ObjectId(companyID)).then(
//   (flag) => {
//     console.log(flag);
//   }
// );
