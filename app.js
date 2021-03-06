require('dotenv').config();

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); //added
const flash = require('connect-flash');
const msal = require('@azure/msal-node');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const morgan = require('morgan');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

//for VT
const config = require('config');
const fs = require('fs');
const cors = require('cors');
const spdy = require('spdy'); //for https
const corsOption = {
 origin: '*',
 credentials: true
};
// for VT (until here)

// const from config(hjson)
const morganFormat = config.get('morganFormat');
const logDirPath = config.get('logDirPath');
const port = config.get('port');
const privkeyPath = config.get('privkeyPath');
const fullchainPath = config.get('fullchainPath');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
var vtRouter = require('./routes/VT'); //if you want to use a path without passwork, use route/VT-open
var vtORouter = require('./routes/VT-open'); //for test only
var tilemapRouter = require('./routes/tilemap');

// logger configuration (no semicolon)
const logger = winston.createLogger({
  transports: [
      new winston.transports.Console(),
      new DailyRotateFile({
          filename: `${logDirPath}/VTserver-log-%DATE%.log`,
          datePattern: 'YYYY-MM-DD'
      })
  ]
})
logger.stream = {
  write: (message) => { logger.info(message.trim())}
}
// logger until here


var app = express();

//Azure
// In-memory storage of logged-in users
// For demo purposes only, production apps should store
// this in a reliable storage
app.locals.users = {};

// MSAL config
const msalConfig = {
  auth: {
    clientId: process.env.OAUTH_CLIENT_ID,
    authority: process.env.OAUTH_AUTHORITY,
    clientSecret: process.env.OAUTH_CLIENT_SECRET
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Verbose,
    }
  }
};

// Create msal application object
app.locals.msalClient = new msal.ConfidentialClientApplication(msalConfig);

//Session witl mysql (from here)////////////////////////
const mysqlOptions ={
  host: 'localhost',
  port: 3306,
  user: 'vectortile',
  password: process.env.MYSQL_PASSWORD, 
  database: process.env.MYSQL_DATABASE
};

const sessionStore = new MySQLStore(mysqlOptions);

const sess = {
  secret: process.env.OAUTH_CLIENT_SECRET,
  cookie: {maxAge: 60000},
  store: new MySQLStore(mysqlOptions),
  resave: false,
  saveUninitialized: false
}

//for production
sess.cookie.secure = true;

app.use(session(sess))

//Session witl mysql (until here)////////////////////////

/*
//for Azure 
// Session middleware
// NOTE: Uses default in-memory session store, which is not
// suitable for production
app.use(session({
  secret: process.env.OAUTH_CLIENT_SECRET,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy'
}));
*/


// Flash middleware
app.use(flash());

// Set up local vars for template layout
app.use(function(req, res, next) {
  // Read any flashed errors and save
  // in the response locals
  res.locals.error = req.flash('error_msg');

  // Check for simple error string and
  // convert to layout's expected format
  var errs = req.flash('error');
  for (var i in errs){
    res.locals.error.push({message: 'An error occurred', debug: errs[i]});
  }

  // Check for an authenticated user and load
  // into response locals
  if (req.session.userId) {
    res.locals.user = app.locals.users[req.session.userId];
  }

  next();
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(morgan(morganFormat, { stream: logger.stream })); //added
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(cors()); //later
app.use(cors(corsOption)) //test
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/vt', vtRouter);
app.use('/vt-open', vtORouter);
app.use('/tilemap', tilemapRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//module.exports = app;


/*
//for http
app.listen(port, () => {
    console.log(`Running at Port ${port} ...`)
//app.listen(3000, () => {
//console.log("running at port 3000 ...")
})
*/

//for https
spdy.createServer({
  key: fs.readFileSync(privkeyPath),
 cert: fs.readFileSync(fullchainPath)
}, app).listen(port)


