require("dotenv").config({path:"./.env" });
require("dotenv").config({path:"./launch/.env" });
const webGameQuizPages = require("../apps/webGameQuiz/index");
const webGameQuizPlans = require("../apps/webGameQuiz/plans");
const webGameQuizPlayers = require("../apps/webGameQuiz/players");
const webGameQuizView = require("../apps/webGameQuiz/qview");
const webGameQuizTest = require("../apps/webGameQuiz/test");
var createError = require('http-errors');
var express = require('express');
var path = require('path');
const model = require("../data/db");
const exs = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const MongoStore = require('connect-mongo');


var JwtStrategy = require("passport-jwt").Strategy,
  ExtractJwt = require("passport-jwt").ExtractJwt,
  AnonymousStrategy = require("passport-anonymous").Strategy;
var cookieExtractor = function(req) {
    var token = null;
    if (req && req.cookies) token = req.cookies['authorization'];
    return token;
  };
  /**
   * @type {import("passport-jwt").StrategyOptions}
   */
var authOpts = {};
  authOpts.jwtFromRequest = ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]);
  authOpts.secretOrKey = "12345abczxY&";
  
var passport = require("passport");
passport.use(new AnonymousStrategy());
passport.use(
  new JwtStrategy(authOpts, async function (jwt_payload, done) {
    try {
      const user = jwt_payload.user; 

      if (user) {
        return done(null, user);
      } else {
        return done(null, null);
      }
    } catch (err) {
      return done(err, null);
    }
  })
);
//var logger = require('morgan');
var app = express();
app.set('view engine', 'pug');
app.set('views', './views');
app.use(express.static('public')); // static content in public folder
var http = require('http');
var https = require('https');
var debug = require('debug')('bot');
var { GameBot } = require('../bot');

var tg = require("telegraf");
const appsToLoad = require("../launch/main");
const { SessionManager } = require("../lib/Sessions");
const dbm = require("../data/db");
const { AppCore } = require("../lib/AppBase");
var apps =null;// new AppCore({});
var sman = new SessionManager();

var bot = new GameBot();
const getApps = ()=>{return apps;};


app.use(
  exs({
      store: new MongoStore({
          collectionName:"websession",
          mongoUrl: process.env["DB"],
          client: model.getDb()
      }),
      secret: 'AcFGtyh',
      saveUninitialized: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.appCore = getApps();
  next();
});


app.use(
  "/access",
  passport.authenticate(["anonymous", "jwt"], { session: false }),
  webGameQuizPages
);


app.use(
  "/plans",
  passport.authenticate(["jwt"], { session: false }),
  webGameQuizPlans
);
app.use(
  "/join",
  passport.authenticate(["anonymous", "jwt"], { session: false }),
  webGameQuizPlayers
);
app.use(
  "/game",
  passport.authenticate(["anonymous", "jwt"], { session: false }),
  webGameQuizView
);
app.use(
  "/test",
  passport.authenticate(["anonymous", "jwt"], { session: false }),
  webGameQuizTest
);


//app.use(logger('dev'));
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  if(res.errored==true){
    next(createError(404));
  }else{
    next();
  }
});
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
});

/**
 * Get port from environment and store in Express.
 */
var port = normalizePort(process.env.PORT || '3401');
app.set('port', port);


/**
 * Create HTTP server.
 */
var SSL = process.env["SSL_CA"]!=null && process.env["SSL_CA"]!="" && process.env["SSL_KEY"]!=null && process.env["SSL_KEY"]!="";
var server = SSL==true ? 
    https.createServer(
        {
          cert: fs.readFileSync(process.env["SSL_CA"]), 
          key: fs.readFileSync(process.env["SSL_KEY"]) 
        }, app) 
         : http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
async function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
  
    await app.startApplication();
}



async function launch(options) {
	
	const isDev = options.isDevMode;
	apps = new AppCore(options);
  
  
	const currentTg = new tg.Telegraf(options.apiKey);
	currentTg.catch((err) => {
		apps.logError("TG error: " + err.message);
	});

	if (apps != null) {
		//var planMan = new ScheduleManager();
		apps.attachTG(currentTg);
		apps.attachSMan(sman);
		apps.setDBContext(dbm);

		await apps.setAppMapping(appsToLoad.mapping);

		await apps.start({
			apikey: options.apiKey
		});

    require("./qview_server")(server, apps);
	}

  const botInfo = await currentTg.telegram.getMe();
  console.log(botInfo);
  apps.setBotInfo(botInfo);

  console.log("Bot is running and listening");

	await currentTg.launch();
}

/**
 * @type {Object<String, {apiKey:String}>}
 */
app.bots = {};


app.startApplication = async () => {
	try {
    await dbm.startDb();
		var botCode = process.env["RUN_BOT"];
		var settings = await dbm.getBot(botCode);
    app.bots[botCode] = settings;

		if(settings.isOnline == false){
			throw "bot is set to be offline";
		}
		// будет выполнена попытка запустить бота
		await launch({
			apiKey: settings.apiKey,
			isDevMode: settings.isDevMode,
			name: settings.name,
			ftpServer: settings.ftpServer,
			ftpDir: settings.ftpDir,
			ftpUser: settings.ftpUser,
			ftpPwd: settings.ftpPwd,
			ftpPort: settings.ftpPort,
			dName: settings.dName
		});

	} catch (e) {
		console.log("error " + e.message);
    await dbm.disconnectDb();
	}
};


