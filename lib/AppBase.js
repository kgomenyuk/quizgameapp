const {UIScreen, UIButton} = require("../lib/UIScreen");
const i18n = require("i18n-nodejs");
const { SessionObject, AppStateObject, SessionManager } = require("./Sessions");
const { Context, Telegram, Telegraf } = require("telegraf");
const { FxArrayHandler } = require("./Triggers");
const { MAppSettings } = require("../data/model_allAppSettings");
const { MBot } = require("../data/model");

/**
 * Settings of an application
 */
class AppSettingsItem{
	/**
	 * @type {String}
	 */
	name;

	/**
	 * @type {any}
	 */
	value;
}
 class AppCoreBot {
	userId=0;
	userName="";
 }

// Application collection
class AppCore {
	/** Telegram service
	* @type {Telegram}
	*/
	tg;

	/** TG bot information
	 * @type {AppCoreBot}
	 */
	botInfo=null;

	/**
	 * @type {SessionManager}
	 */
	sMan;

	constructor(options) {
		const isDeveloperMode = options.isDevMode; // режим разработчика
		const dName = options.dName; // доменное имя приложения
		// коллекция приложений
		this.arrAppCollection = [];
		this.dictAppCollection = {};
		/**
		 * @type {SessionManager}
		 */
		this.sMan = null;
		this.fMan = null; //ссылка на файловый репозиторий
		this.pMan = null;
		this.dbX = null; // контекст prisma
		/**
		 * All command handlers
		 * @type {[FxArrayHandler]}
		 */
		this.arrHandleCommands = [];
		this.dictHandleCommands = {};
		// обработчик сообщений
		// {app} = [triggers]
		this.objHandleMessages = {};
		// обработчики колл-бэков

		this.arrHandleCallback = [];
		// {app} = [triggers]
		this.dictHandleCallback = {};
		// переключения между приложениями
		this.dictHandleAppSwitch = {};
		// возможные оповещения
		this.dictNotifications = {};
		// менеджер сессий задан
		this.isSManSet = false;
		// компонент планирования задан
		this.isPManSet = false;
		// ссылка на телеграм
		this.isTGSet = false;
		// работает ли сервис
		this.isOnline = false; // если true - то обслуживать запросы. Иначе отправлять сообщения о недоступности сервиса в настоящий момент
		this.isDbXSet = false; //был ли установлен контекст подключения к базе данных prisma
		// режим разработчика?
		this.isDeveloperMode = () => {
			return isDeveloperMode;
		};
		this.dName = () => {
			return dName;
		}; // доменное имя
	}

	// записать сообщение в лог
	logError(msg, raise) {
		console.log("ERR:" + msg);
		if (raise == true) {
			throw "ERROR at core: " + msg;
		}
	}

	attachTG(tgService) {
			this.tg = tgService;
		}
		/**
		 * Add session manager
		 * */
	attachSMan(sMan) {
		if (sMan != null) {
			this.sMan = sMan;
			sMan.setAppCore(this);
			this.isSManSet = true;
		} else {
			this.isSManSet = false;
		}
	}
	attachFMan(fMan) {
		if (fMan != null) {
			this.fMan = fMan;
			fMan.setAppCore(this);
			this.iFfManSet = true;
		} else {
			this.isFManSet = false;
		}
	}
	attachPlanMan(pMan) {
		if (pMan != null) {
			this.pMan = pMan
			this.isPManSet = true;
			pMan.connectNotifications(false, this.notify.bind(this));
		} else {
			this.isPManSet = false;
		}
	}
	setDBContext(dbx){
		this.isDbXSet = true;
		this.dbX = dbx;
	}
	/**
	 * 
	 * @param {AppBase} app 
	 */
	addApp(app) {
			this.arrAppCollection.push(app);
			this.dictAppCollection[app.app] = app;
			app.setAppCore(this);
			if(this.isDbXSet == true){
				app.setDBContext(this.dbX);
			}
		}
		// обработка сообщения только в случае ожидания
	messageHandlerUserAware() {
			//
		}

	/**
	 * redirect to application
	 */
	routeStartToApp = async (ctx) => {
		var txt = ctx.message.text;
		if(txt.startsWith("/start")){
			txt = txt.substring(7,100);
			if(txt.startsWith("C-")){
				var p = txt.split("-");
				ctx.params={
					app: p[1],
					cmd: p[2],
					data: p[3]
				};
				await this.sendCommand(p[2], ctx);
			}
		}
		
	};
	
		// запустить все приложения
	start = async (settings) => {
		try {
			const THIS = this;

			for (i = 0; i < this.arrAppCollection.length; i++) {
				app = this.arrAppCollection[i];
				// load all settings first
				await app.loadData(settings);
			}

			for (var i = 0; i < this.arrAppCollection.length; i++) {
				var app = this.arrAppCollection[i];
				// activate the triggers
				this.turnOnTriggers(app);
			}

			// track all group-related manipulations
			this.tg.on("new_chat_members", 
			/**
			 * @param {Context} ctx 
			 */
				async (ctx) => {
					console.log("  ");

					var user = ctx.from;
					var group = ctx.chat.id;
					var group_title = ctx.chat.title;
					var added = ctx.message.new_chat_members;
					
					if(added.find(a=>a.username == ctx.me)!=null){
						// bot was added to a group
						await MBot.updateOne({ botCode:settings.botCode }, {
							$push:{
								groups:{
									id: group + "", 
									userAdded: user.id, 
									userAddedU: user.username,
									groupTitle: group_title,
									timestamp: new Date()
								}
							}
						}).exec();
					}
			});
			this.tg.on("left_chat_member", 
			/**
			 * @param {Context} ctx 
			 */
				async (ctx) => {
					console.log("  ");
					var user = ctx.from.id;
					var group = ctx.chat.id;
					var group_title = ctx.chat.title;
					var left = ctx.message.left_chat_member.id;
					var leftu = ctx.message.left_chat_member.username;
					if(leftu == ctx.me){
						// bot was removed from group
						await MBot.updateOne({ botCode:settings.botCode }, {
							$pull:{
								groups:{id: group + ""}
							}
						}).exec();
					}
			});

			// attach everything to TG

			var startH = this.arrHandleCommands.find(x=>x.id == "start");
			if(startH==null){
				startH = new FxArrayHandler("start");
				this.arrHandleCommands.push(startH);
			}
			startH.attach(this.routeStartToApp);

			for (var i = 0; i < this.arrHandleCommands.length; i++) {
				var h = this.arrHandleCommands[i];
				this.tg.command(h.id, h.getHandler());
			}

			this.tg.on("message", async(ctx) => {
				await THIS.sendMessage(ctx);
			});

			this.tg.on("callback_query", async(ctx) => {
				await THIS.sendCallback(ctx);
			});

			


			this.isOnline = true;
			if(this.isPManSet == true){
				this.pMan.isNotifOnline = true;
				this.pMan.start();
			}
		} catch (ex) {
			this.isOnline = false;
			if(this.isPManSet == true){
				this.pMan.isNotifOnline = false;
			}
			this.logError("Could not start system. " + ex.message);
		}
	}

	// зарегистрировать триггеры приложения
	// не хватает триггера для считывания ответа в опросе и еще чего-то (скорее всего)
	turnOnTriggers(app) {
		app.createTriggers.bind(app)();
		for (var i = 0; i < app.triggers.length; i++) {
			var trigger = app.triggers[i];
			switch (trigger.action) {
			case "command":
				var text = trigger.commandName;
				var f = (
					function (c, t, s) {
						return async(ctx) => {
							if (app.isSystem == false && c.isOnline == false) {
								await c.notifyOffline(ctx);
								return;
							}
							await app.run(c, t, s, ctx);
						};
					})(this, trigger, this.sMan);
				if (this.dictHandleCommands[text] == null) {
					var h = new FxArrayHandler(text);
					this.dictHandleCommands[text] = h;
					this.arrHandleCommands.push(h);
				}
				this.dictHandleCommands[text].attach(f);
				break;
			case "message":
				// присоединить приложение к сообщениям
				// работа с сообщениями отличается от работы с командами:
				// >> Какое приложение ожидает ввод в виде сообщения сейчас?

				// приложению надо сопоставить триггер
				var arr = this.objHandleMessages[app.app];
				if (arr == null) {
					this.objHandleMessages[app.app] = [];
				} else {

				}
				this.objHandleMessages[app.app].push(trigger);
				break;
			case "callback":
				// присоединить приложение к коллбэку
				// внесение триггера в словарь
				var arr = this.dictHandleCallback[app.app];
				if (arr == null) {
					this.dictHandleCallback[app.app] = [];
				} else {

				}
				this.dictHandleCallback[app.app].push(trigger);
				break;
			case "app":
				// триггер переключения реагирует на входящее переключение
				var arr = this.dictHandleAppSwitch[app.app];
				if (arr == null) {
					this.dictHandleAppSwitch[app.app] = [];
				} else {

				}
				this.dictHandleAppSwitch[app.app].push(trigger);

				break;
			case "notification":
				// триггер оповещения
				var arr = this.dictNotifications[app.app];
				if (arr == null) {
					this.dictNotifications[app.app] = [];
				} else {

				}
				this.dictNotifications[app.app].push(trigger);
				break;
			}
		}
	}

	// отправить оповещение о том, что сейчас сервис недоступен
	async notifyOffline(ctx) {
		if (ctx.message !== null) {
			await ctx.reply("Сервис временно недоступен");
		} else if (ctx.callbackQuery !== null) {
			await ctx.anwserCallbackQuery("Сервис временно недоступен");
		}
	}

	async sendMessage(ctx) {
		if (this.isOnline == false) {
			await this.notifyOffline(ctx);
			return;
		}

		// public message in group
		var isPublic = ctx.chat.id < 0;
		// skip
		if(isPublic == true){
			return;
		}

		// где ждут сообщение от пользователя?
		var s = await this.sMan.tg(ctx, this);
		var apps = s.getWatchMessageApps();

		if (apps == null || apps.length == 0) {
			// не ждм сообщение от пользователя
			this.logError("Message is not allowed for user #" + s.userId);
			return;
		}

		// в цикле пройти по приложениям и найти нужные триггеры
		for (var i = 0; i < apps.length; i++) {
			var appName = apps[i];
			var app = this.dictAppCollection[appName];
			var triggers = this.objHandleMessages[appName];

			if (app == null) {
				throw "Application " + appName + " is not known";
			}

			if (triggers == null) {
				// триггеры не нашлись и это ошибка
				this.logError("triggers not found for message and user #" + s.userId);
				return;
			} else {
				var runTriggers = triggers.filter(x => {
					return x.recheck(s, ctx, s.getAppState().data);
				});
				if (runTriggers == null || runTriggers.length == 0) {
					// после фильтрации ничего не осталось
					this.logError("Triggers not found after filtering");
				} else {
					// запускаем нужное приложение, соответствующее найденным триггерам
					for (const trigger of runTriggers) {
						// последовательное выполнение вызовов
						await app.run(this, trigger, this.sMan, ctx);
					}
					//console.log("END!!");
				}
			}

		}
	}

	async sendCallback(ctx) {
		if (this.isOnline == false) {
			await this.notifyOffline(ctx);
			return;
		}
		// где ждут сообщение от пользователя?
		var s = await this.sMan.tg(ctx, this);
		var apps = s.getWatchCallbackApps();
		var arrRunTriggers = [];

		// await ctx.answerCbQuery();// test 1

		if (apps == null || apps.length == 0) {
			// не ждём  от пользователя
			this.logError("Callback is not allowed for user #" + s.userId);
			return;
		}

		// в цикле пройти по приложениям и найти нужные триггеры
		for (var i = 0; i < apps.length; i++) {
			var appName = apps[i];
			var app = this.dictAppCollection[appName];
			var triggers = this.dictHandleCallback[appName];

			if (app == null) {
				throw "Application " + appName + " is not known";
			}

			if (triggers == null) {
				// триггеры не нашлись и это ошибка
				this.logError("triggers not found for callback and user #" + s.userId);
				return;
			} else {
				var runTriggers = triggers.filter(x => {
					try {
						return x.recheck(s, ctx, s.getAppState().data);
					} catch (ex) {
						this.logError("incorrect filter in trigger #" + x.id);
						return false;
					}
				});
				if (runTriggers != null) {
					arrRunTriggers = arrRunTriggers.concat(runTriggers.map(t => {
						// последовательное выполнение вызовов
						const fx =
							(
								(application, core, trigger, sman) =>
								async(context) => await application.run(core, trigger, sman, context)
							)(app, this, t, this.sMan);
						return fx;
					}));
				}
			}
		}

		if (apps != null && apps.length > 0 && (arrRunTriggers == null || arrRunTriggers.length == 0)) {
			// после фильтрации ничего не осталось
			this.logError("Triggers not found after filtering");
		} else {
			// запускаем нужное приложение, соответствующее найденным триггерам
			for (const trigger of arrRunTriggers) {
				// последовательное выполнение вызовов
				//await app.run(this, trigger, this.sMan, ctx);
				await trigger(ctx);
			}
			//console.log("END!!");
		}
	}

	async sendCommand(commandName, ctx) {
		if (this.isOnline == false) {
			await this.notifyOffline(ctx);
			return;
		}
		var ch = this.dictHandleCommands[commandName];
		if (ch == null) {
			// команда не обрабатывается приложением
			this.logError("Command " + commandName + " not supported");
		} else {
			await ch.handle(ctx);
		}
	}

	async sendCommandWithUser(commandName, ctx) {
		if (ctx.userId == null) {
			// пользователь неизвестен. тогда не получится отправить оповещение по адресу
			throw "User is unknown. Could not handle a notification";
		}
		var ch = this.dictHandleCommands[commandName];
		if (ch == null) {
			// команда не обрабатывается приложением
			this.logError("Command " + commandName + " not supported");
		} else {
			await ch.handle({
				sysUserId: userId
			});
		}
	}

		// задать параметры создания коллекции приложений
	async setAppMapping(mapping) {
			this.mapping = mapping;
			for (let botAppConfig of this.mapping) {
				// alias
				const instance = botAppConfig.newInstance();
				instance.assignAlias(botAppConfig.alias);
				botAppConfig.app = instance.app;
				this.addApp(instance);
			}
		}
		// переключиться в другое приложение
	async sendSwitchApp(targetAppAlias, ctx, preserveState) {
		let targetApp = this.mapping.find((m) => m.alias === targetAppAlias);
		if (!targetApp) {
			throw "App alias " + targetAppAlias + " not found";
		}
		var s = await this.sMan.tg(ctx, this);
		// найти новое приложение
		var appTarget = this.dictAppCollection[targetApp.alias];
		if (appTarget == null) {
			this.logError("application " + targetApp.alias + " does not exist", true);
			return;
		}
		// найти триггер
		var currentAppName = s.app;

		if (currentAppName == null || currentAppName == "") {
			this.logError("current application is unknown", true);
		}

		// переключиться на уровне сессии и выполнить обработчик события
		var candidates = this.dictHandleAppSwitch[targetApp.alias];
		if (candidates == null) {
			// ничего не нашлось
			this.logError("switching trigger for " + targetApp.alias + " not found", true);
			return;
		}

		var selected = candidates.filter(trigger => {
			if (trigger.srcAppName === currentAppName) {
				try {
					return trigger.recheck(s, s.getAppState(), s.getAppState().data);
				} catch (ex) {
					this.logError("trigger check error at #" + trigger.id, true);
					return false;
				}
			} else {
				return false;
			}
		});
		if (selected.length > 1) {
			this.logError("more than one trigger found for app switching " + currentAppName + " --> " + targetApp.alias);
			return;
		}
		if (selected == null || selected.length == 0) {
			this.logError("no trigger found for app switching " + currentAppName + " --> " + targetApp.alias);
			return;
		}

		await appTarget.run(this, selected[0], this.sMan, ctx);
	}

	sendFunctionCall() {
		// пока нет поддержки прямых вызовов функций приложений
	}

	// получить отчёт о работающих приложениях
	async quickStats() {
		var report = [];
		if (this.sMan != null) {
			report.push("sessions: " + this.sMan.arrSessions.length);
			var stateStats = this.sMan.countStates();
			for (var i = 0; i < this.arrAppCollection.length; i++) {
				var appObj = this.arrAppCollection[i];
				// дописываем данные про каждое приложение в отчёт
				report.push(appObj.app + " " + "states: " + JSON.stringify(stateStats));
				report.push(appObj.app + " " + "run: " + appObj.runCount);
				report.push(appObj.app + " " + "errors: " + appObj.errorCount);
			}
		}
		return report.join("\n");
	}

	// отключить
	async goOffline() {
		this.isOnline = false;
	}

	// включить
	async goOnline() {
		this.isOnline = true;
	}

	// отключить
	async notifsOff() {
		this.pMan.isNotifOnline = false;
	}

	// включить
	async notifsOn() {
		this.pMan.isNotifOnline = true;
	}

	// send notification to app
	async notify(notification) {
		// надо найти цель маршрутизации сообщения
		// выбрать тип оповещения и аргумент. Эти данные будут использоваться в функции обработки вызова
		if (notification == null) {
			// ошибка
			this.logError("notification is null");
			return false;
		}
		// приложение и тип оповещения
		if (notification.appId != null && notification.nType != null && notification.userId != null) {
			let targetApp = this.mapping.find((m) => m.alias === notification.appId);
			if (!targetApp) {
				throw new Error("App alias " + notification.appId + " not found for notification " + notification.id);
			}
			const triggers = this.dictNotifications[targetApp.alias];
			// надо найти нужное оповещение и передать управление в нужный обработчик

			if (triggers == null || triggers.length == 0) {
				// триггеры не были найдены
				this.logError("notification trigger not found");
				return false;
			}

			var runTriggers = triggers.filter(x => {
				return x.recheck({}, notification);
			});
			if (runTriggers == null || runTriggers.length == 0) {
				// после фильтрации ничего не осталось
				this.logError("N-triggers not found after filtering");
			} else {
				var app = this.dictAppCollection[notification.appId];
				if (app == null) {
					throw new Error("app not defined");
				}
				// which trigger will be activated?
				for (const trigger of runTriggers) {
					// последовательное выполнение вызовов
					await app.run(this, trigger, this.sMan, {
						notification: notification,
						sysUserId: notification.userId, // пользователь был задан вручную, а не из ТГ
						reply: async(a, b) => {
								return await this.tg.telegram.sendMessage(notification.userId, a, b);
							} // функция для совместимости с обычными кодом
					});
					// упрощенный вариант обработки события без внутренних механизмов приложения
					// await trigger.handlerFunction(null, null, notification);
				}
				//console.log("END!!");
			}

		} else {
			// чего-то не хватает для дальнейшей нормальной работы с уведомлением
			return false;
		}
		return true;
	}

	setBotInfo(info){
		this.botInfo = new AppCoreBot();
		this.botInfo.userId = info.id;
		this.botInfo.userName = info.username;
	}

	/**
	 * emin event to be sent through websockets
	 * @type { Promise<boolean>(string, string, string)}
	 */
	_emit;

	/**
	 * Send event via websockets
	 * @param {*} appName 
	 * @param {*} eventName 
	 * @param {*} eventData 
	 * @returns 
	 */
	async emit(appName, eventName, eventData){
		return await this._emit(appName, eventName, eventData);
	};

	setEmitFx=(fx)=>{
		this._emit = fx;
	};
}


/*
Base class for an application
*/
class AppBase {
	/**
	 * @type {[AppSettingsItem]}
	 */
	_settings = [];

	/** Returns settings from the database
	 * @type {[AppSettingsItem]}
	 */
	getSettings(){
		return this._settings;
	}

	/** Get one settings element by its name
	 * 
	 * @param { String } name 
	 * @returns { AppSettingsItem }
	 */
	getSettingsItem(name){
		return this._settings.find(x=>x.name == name);
	}

	/**
	 * @type {String}
	 */
	currentAlias = ""; // alias of the application that was assigned while start-up

	/**
	 * alias from the launch configuration
	 * @param {String} alias 
	 */
	assignAlias = (alias) => {
		this.currentAlias = alias;
	}
	
	constructor(code, params){
		this.params = params;
		this.app = "Unknown";

		this.app = this.app + (code == null ? "" : "_" + code);

		
		this.actions = []; 
		this.isPublicAllowed = false; // app works in public group
		this.isPrivateAllowed = false; // app works in private chat
		this.messageOnPPError = false; // send error message
		this.runCount = 0; // number of runs
		this.errorCount = 0;// number of errors
		this.isSystem = false;// true = application will work if isOnline = false
		this.core = null;// reference to AppCore
		this.appCode = code;
		this._init(code); 
		
		/**
		 * @type {any}
		 */
		this.triggers = [];
		//this.triggers = this.getTriggers.bind(this)(code); // triggers of applications

		this.dbContext = null;

		/** Localization */ 
		this.i18nLang = {};
		
		/**
		 * 
		 * @param {*} core 
		 * @param {*} trigger 
		 * @param {*} sess 
		 * @param {Context} ctx 
		 */
		this.run = async (core, trigger, sess, ctx) => {
			this.runCount++;
			// сначала надо получить сессию
			var s = null;
			var valid = true;
			if(sess!=null){
				// менеджер сессий доступен
				s = await sess.tg(ctx);
			}else{
				console.log("Session manager is not available");
			}
			var valid = true;
			
			if(s != null){
				// проверка возможности работы в публичном чате
				if( !s.isPublic || (s.isPublic && this.isPublicAllowed) ){
					valid = true;
				}else{
					valid = false;
				}
			}
			
			// -- end of checks
			try{
				//
				if(!valid){
					throw new Error("Public call not allowed");
				}
				// --
				
				console.log(">> entered");
				s.proceed();
				const continuous = s.enterApp(this.app);
				
				// create the state if it does not exist
				if(continuous === false){
					// создать объект состояния приложения и записываем в сессию
					const obj = this.newSessionDataObject();
					s.createAppState(obj);         
					s.chatId = ctx.chat.id;
					// localization
					var lang = s.user.lang;
					var l = this.loc(lang);
					s.loc = l;
					// read user-specific settings from the database
					const userSettings = await this.loadUserSettings(s.userId);
					if(userSettings!=null){
						obj.userSettings = userSettings;
					}
				}
				
				// состояние приложения
				const appState = s.getAppState();
				// добавить дополнительные данные
				if(ctx.callbackQuery){
					//var screen = appState.getScreen(ctx.callbackQuery.message.message_id);
					// кнопка?
					//if(screen == null){ 
					//	screen = new UIScreen();
					//	appState.addScreen(screen);
					//}
					//screen.fromTGMessage(ctx.callbackQuery.message, ctx.callbackQuery.data);
				}else if(ctx.message){
					//var screen = appState.getScreen(ctx.message.message_id);
					// кнопка?
					//if(screen == null){ 
					//	screen = new UIScreen(); 
					//	screen.fromTGMessage(ctx.message);
					//	screen.setMode("command");
					//	appState.addScreen(ctx.message.message_id, screen);
					//}
				}
				
				// выполнить проверки перед выполнением действия и внести изменения в состояние
				var checkResult = this.checkBeforeRun(s, trigger, appState);
				
				var continue_session = false; // сессия должна быть продолжена
				
				if(s.isPublic === true){
					continue_session = await this._run_public(s, trigger, appState, ctx);
				}else{
					continue_session = await this._run(s, trigger, appState, ctx);
				}
				
				if(continue_session === false){
					// окончить сессию
					s.dropCurrentState();
				}
				
				// завершение обработки запроса
				if( trigger.action == "callback" ){
					await ctx.answerCbQuery(null);
				}
			}catch(ex){
				// поведение по умолчанию - отправить сообщение об ошибке пользователю
				this.errorCount++;
				await this._onError(s, trigger, ctx, ex);
				s.logError(ex);
			}
		}
	}

	// функция вернёт объект для выполнения локализации
	loc(lang){
		if(lang == null){
			lang = "en";
		}
		if(this.i18nLang[lang]==null){
			// попробовать загрузить из файла
			try{
				this.i18nLang[lang] = new i18n(lang, "./../../i18n/" + this.app + ".json");
			}catch(e){
				this.i18nLang[lang] = "F";
			}
			return this.i18nLang[lang];
		}else if(this.i18nLang[lang]=="F"){
			return null;
		}
		else{
			return this.i18nLang[lang];
		}
	}

	/** Get the @name of the bot
	 * @returns {String}
	 */
	getBotUserName(){
		return this.getAppCore().tg;
	}

	/**
	 * @param { SessionManager } sman
	 */
	_requireSharedData = (sman)  => {
		
	}


	// read user's settings for current application
	async _loadUserSettings(userId, dbcontext){
		// надо найти нужную функцию
		// app<appname>EnsureGet
		var fx =  dbcontext["app" + this.app + "ReadUserSettings"];
		if(fx == null){
			return {};
		} else {
			return await fx(userId);
		}
	}
	// read user's settings for current application
	async loadUserSettings(userId){
		var dbcontext = this.dbContext;
		if(dbcontext == null){
			return null;
		}else{
			return await this._loadUserSettings(userId, dbcontext);
		}
	}

	// read app settings from the database
	/**
	 * 
	 * @param {*} dbcontext 
	 * @returns { [AppSettingsItem] }
	 */
	async _loadApplicationSettings(dbcontext){
		// it should return a JS object
		var fx =  dbcontext["app" + this.currentAlias + "ReadAppSettings"];
		if(fx == null){
			// try looking in DB
			var qResult = MAppSettings.findOne({appAlias:this.currentAlias});
			var result = await qResult.exec();
			if(result!=null){
				var sobj =  result.toObject().settings;
				var robj = sobj.reduce((p, x)=>{
					if(x.propertyArray!=null && x.propertyArray.length > 0){
						p[x.propertyName] = x.propertyArray;
					}else{
						p[x.propertyName] = x.propertyValue;
					}
					
					return p;
				},
					{});
				return robj;
			}else{
				return [];
			}
		} else {
			return await fx();
		}
	}
	// read app settings from the database
	/**
	 * 
	 * @returns {[AppSettingsItem]}
	 */
	async loadApplicationSettings(){
		var dbcontext = this.dbContext;
		if(dbcontext == null){
			return null;
		}else{
			const s = await this._loadApplicationSettings(dbcontext);
			if(s!=null){
				this._settings = 
					s.map(x=>{
						const a = new AppSettingsItem();
						a.name = x.name;
						a.value = x.value;
						return a;
					});
			}else{
				this._settings = [];
			}
			return this.settings;
		}
	}

	setDBContext(dbx){
		this.dbContext = dbx;
	}

	/**
	 * поддержка отложенных действий в диалогах с пользователем
	 */
	
	/**
	 * 
	 * @returns String Version number
	 */
	getVersion(){
		return "0.1";
	}
	
	/** заполнить поля необходимыми данными
	 * */
	async loadData(settings){
		const loadRes = await this._loadData(settings);
		if(loadRes === true){
			// 
		}else{
			throw "Application " + this.app + " could not load initial data";
		}

		await this.loadApplicationSettings();
	}
	
	// инициализация приложения. здесь надо задать начальные настройки приложения
	_init(){
		
	}
	// загрузить начальные данные, которые нужны для успешного выполнения приложения
	async _loadData(settings){
		return true;
	}
	/**
	 * 
	 * @param {*} session 
	 * @param {TGEventTrigger} trigger 
	 * @param {AppStateObject} appState 
	 * @param {Context} ctx 
	 * @returns 
	 */
	async _run(session, trigger, appState, ctx){
		if(trigger.handlerFunction != null){
			const hf = trigger.handlerFunction.bind(this);
			return await hf(session, ctx, appState.data);
		}else{
			console.log("Trigger without handler");
		}
		return true;// true означает продолжение сессии
	}
	async _run_public(session, trigger, appState, ctx){
		if(trigger.handlerFunction != null){
			return await trigger.handlerFunction(session, ctx, appState);
		}
		return true;
	}
	
	
	/**
	 * получить пустой начальный объект с данными для сессии
	 * */
	newSessionDataObject(){
		//  нужно переопределить данную функцию в классе приложения для корректной работы с приложением 
		return this._newSessionDataObject();
	}
	
	_newSessionDataObject(){
		return {};
	}
	
	// cессия будет завершена. нужно выполнить очистку. например, удалить сообщения из чата или убрать клавиатуру
	sessionIsClosing(){
		
	}
	
	// создавалось ли сообщение с заголовком? 
	hasCaptionMessage(state){
		try{ return state.data.captionMessageId != null; }catch(e){ return false; }
	}
	
	// удалить сообщения, которые были связаны с приложением
	async clearMessages(s, ctx, state, all){
		// новая версия очистки сообщений
		let arrClrScr = this.getActiveMessages(state);
		if(arrClrScr.length > 0){
			if(all == true){
				// убираем заголовок
				let arrH = arrClrScr.filter(c=>c.isHeader == true);
				for(const h of arrH){
					await ctx.tg.deleteMessage(s.userId, h.id)
					h.fx(state.data);
				}
			}
			let arrB = arrClrScr.filter(c=>c.isHeader == false);
				for(const b of arrB){
					await ctx.tg.deleteMessage(s.userId, b.id)
					b.fx(state.data);
				}
		}
		return;
	}
	
	// функция, которая будет вызываться каждый раз, когда происходит ошибка выполнения в приложения
	async _onError(s, trigger, ctx, ex){
		if( trigger != null && ctx != null ) { 
			// если это был коллбэк - надо показать сообщение об ошибке
			if( trigger.action == "callback" ){
				// отправить сообщение об ошибке
				// MSG#001
				await ctx.answerCbQuery("Что-то пошло не так");
			}
			if( trigger.action == "message" ){
				// отправить сообщение об ошибке
				// MSG#001
				await ctx.reply("Что-то пошло не так");
			}
		}
	}
	
	createTriggers(){
		this.triggers = this.getTriggers.bind(this)();
	}

	getTriggers(){
		return this._getTriggers.bind(this)();
	}
	// переопределяемый метод получения списка триггеров
	_getTriggers(){
		return [];
	}
	
	checkBeforeRun(session, trigger, state){
		return this._checkBeforeRun(session, trigger, state);
	}
	// надо переопределить. Для прерывания работы - false
	_checkBeforeRun(session, trigger, state){
		return true;
	}
	
	// переключиться к другому приложению
	async switchToApp(targetApp, preserveState){
		await this.core.sendSwitchApp(targetApp, preserveState);
	}

	// выполнить по команде
	async onCommand(s, t, comname, fx, applyCheck){
		if(applyCheck === true){
			var ok = this.beforeRun();
			if(ok===false){
				throw "check failed at " + comname;
			}
		}	
		// надо запустить функцию
		await fx();
	}
	// выполнить при получении коллбэка
	async onCallbackData(data, fx, applyCheck){
		
	}
	/**
	 * @returns {Object<String, Object>} Shared dictionary for a single application
	 */
	getSharedData=()=>{
		return this.getAppCore().sMan.getSharedCollection(this.currentAlias);
	}
	/**
	 * @param {AppCore} core 
	 */
	setAppCore(core){
		this.core = core;
		// request place for shared data
		this._requireSharedData(core.sMan);
	}
	/**
	 * 
	 * @returns {AppCore}
	 */
	getAppCore(){
		return this.core;
	}
	/** массив id, isHeader с номерами сообщений, которые используются постоянно и которые подлежат удалению в конце работы приложения*/
	getActiveMessages(state){
		return this._getActiveMessages(state);
	}
	/** массив id, isHeader с номерами сообщений, которые используются постоянно и которые подлежат удалению в конце работы приложения*/
	_getActiveMessages(state){
		let arr=[];
		if(state != null && state.data != null){
			if(state.data.messageId){
				arr.push({id:state.data.messageId, isHeader:false, fx:(stateData)=>{stateData.messageId=null;}});
			}
			if(state.data.captionMessageId){
				arr.push({id:state.data.captionMessageId, isHeader:true, fx:(stateData)=>{stateData.captionMessageId=null;}});
			}
			if(state.data.prevMessageId){
				arr.push({id:state.data.prevMessageId, isHeader:false, fx:(stateData)=>{stateData.prevMessageId=null;}});
			}
		}
		return arr;
	}

	/** проверить наличие пользователя и создать его, если он отсутствует в базе */
	ensureUserRecord=async()=>{
		

	}

	/**
	 * Find state data of another user in the same application
	 * @param {number} uid Identifier of a user
	 * @returns {AppStateObject}
	 */
	getAppStateOfUser=async(uid)=>{
		var c = this.getAppCore();
		var s = c.sMan.fetch(uid);
		if(s!=null){
			var aso = s.getAppStateFor(this.app);
			if(aso!=null){
				return aso;
			}else{
				return null;
			}
		}else{
			return null;
		}
	}

	/**
	 * Find session of another user
	 * @param {number} uid Identifier of a user
	 * @returns {SessionObject}
	 */
	getSessionOfUser = async (uid) => {
		var c = this.getAppCore();
		var s = c.sMan.fetch(uid);
		if(s!=null){
			return s;
		}else{
			return null;
		}
	}


	

}


module.exports= {
	AppCore,
	AppBase,
	AppSettingsItem
}