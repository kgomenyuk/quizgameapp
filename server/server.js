require("dotenv").config({path:"./.env" });
require("dotenv").config({path:"./launch/.env" });
var createError = require('http-errors');
var express = require('express');
var path = require('path');
//var logger = require('morgan');
var app = express();
var http = require('http');
var debug = require('debug')('bot');
var { GameBot } = require('../bot');

var tg = require("telegraf");
const appsToLoad = require("../launch/main");
const { AppCore } = require("../lib/appCore");
const { SessionManager } = require("../lib/Sessions");
const dbm = require("../data/db");
var apps = new AppCore({});
var sman = new SessionManager();

var bot = new GameBot();

//app.use(logger('dev'));
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
});

/**
 * Get port from environment and store in Express.
 */
var port = normalizePort(process.env.PORT || '3401');
app.set('port', port);

/**
 * Create HTTP server.
 */
var server = http.createServer(app);

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
  
    //await bot.startBot();
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
	}

	await currentTg.launch();
	console.log("Bot is running and listening.");
}


app.startApplication = async () => {
	try {
    await dbm.startDb();
		var botCode = process.env["RUN_BOT"];
		var settings = await dbm.getBot(botCode);

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