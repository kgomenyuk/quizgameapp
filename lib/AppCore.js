const { AppBase } = require("./appBase");
const { SessionManager } = require("./Sessions");



// handler with array of functions
class FxArrayHandler {
	constructor(id) {
			this.steps = []; // обработчики	
			this.id = id; // текст
		}
		// присоединить ещё одну функцию
	attach(f) {
		this.steps.push(f);
	}
	getHandler() {
			return async(ctx) => {
				await this.handle(ctx);
			};
		}
		// обработать событие
	async handle(ctx) {
		var cnt = this.steps.length;
		for (var i = 0; i < this.steps.length; i++) {
			var step = this.steps[i];
			await step(ctx, i, cnt);
		}
	}
}

// 
class ActionTrigger {
	constructor(id) {
			this.source = "any"; // tg, app, core источник события - телеграм, другое приложение, система
			this.action = "any"; //message, callback, command, call связанное действие - получение сообщения, нажатие кнопки, вызов команды, вызов из друго приложения или системы
			this.handlerFunction = null; // обработчик действия function(sess, objevt, state). Возвращает true/false для обозначения продолжения сессии

			this.id = id; // уникальный идентификатор триггера внутри приложения
		}
		// выполнить проверку условий запуска триггера
		// вход - сессия и контекст телеграма
	recheck(objSession, objEvent) {
			return this._recheck(objSession, this._mapper(objEvent));
		}
		// функция для переопределения
	_recheck(objSession, objEvent) {
			return true;
		}
		// сопоставление объекта для передачи в проверку
	_mapper(objEvent) {
		return objEvent;
	}
}

/**
 * событие, вызванное телеграмом
 * */
 class TGEventTrigger extends ActionTrigger {
	constructor(id) {
		super(id);
		this.source = "tg";
		this.isPrivate = true;
		this.isPublic = true;
	}
	rejectPublic() {
		this.isPublic = false;
	}
	rejectPrivate() {
		this.isPrivate = false;
	}
}

/**
 * событие получения сообщения через телеграм
 * filter(session, message, state)
 * */
 class TGMessageEventTrigger extends TGEventTrigger {
	/**
	 * 
	 * @param {string} id 
	 * @param {(string, any, any)=>void} fxFilter 
	 */
	constructor(id, fxFilter) { //+ pattern
		super(id);
		this.action = "message";
		this.filter = fxFilter;
	}
	_mapper(ctx) {
			return ctx.message;
		}
		// перепроверка условий срабатывания триггера
	_recheck(s, e) {
		if (this.filter != null) {
			const state = s.getAppState();
			return this.filter(s, e, state);
		} else {
			return true;
		}
	}
}

/**
 * событие получения коллбэка после нажатия кнопки в телеграме
 * Порядок проверки:
 * Если задан только шаблон - проверка по шалону
 * Если задана функция - проверка с помощью функции
 * Если заданы и функция и шаблон - сначала проверяется шаблон, а затем выполняется функция
 * */
class TGCallbackEventTrigger extends TGEventTrigger {
	constructor(id, fxFilter, regexPattern) {
		super(id);
		this.action = "callback";
		this.filter = fxFilter;
		this.dataPattern = regexPattern; // шаблон 
		this.isPattern = false;
		if (regexPattern != null) {
			this.isPattern = true;
		}
	}

	_mapper(ctx) {
		return ctx.callbackQuery;
	}

	// перепроверка условий срабатывания триггера
	_recheck(s, e) {
		if (this.isPattern === true) {
			if (e.data.match(this.dataPattern)) {
				if (this.filter != null) {
					return this.filter(s, e);
				} else {
					return true;
				}
			} else {
				return false;
			}
		} else {
			if (this.filter != null) {
				return this.filter(s, e);
			} else {
				return true;
			}
		}
	}
}

/**
 * триггер - команда
 * */
class TGCommandEventTrigger extends TGEventTrigger {
	constructor(id, commandName, fxFilter) {
			super(id);
			this.action = "command";
			this.filter = fxFilter;
			this.commandName = commandName;
		}
		// перепроверка условий срабатывания триггера
	_recheck(s, e) {
		if (this.filter != null) {
			return this.filter(s, e);
		} else {
			return true;
		}
	}
}

/**
 * вызов от другого приложения
 * */
class AppEventTrigger extends ActionTrigger {
	constructor(id, srcAppName, fxFilter) {
		super(id);
		this.source = "app";
		this.action = "app";
		this.srcAppName = srcAppName;
		this.filter = fxFilter;
	}

	_recheck(s, eo) {
		if (this.filter != null) {
			return this.filter(s, eo);
		} else {
			return true;
		}
	}
}

/**
 * триггер - вызов функции приложения. например, это может быть функция запуска приложения start
 * */
class CallEventTrigger extends ActionTrigger {
	constructor(id, callName) {
		super(id);
		this.source = "core";
		this.callName = callName;
	}
}

/**
 * триггер оповещения
 * */
class NotificationTrigger extends ActionTrigger {
	constructor(id, nType) {
		super(id);
		this.source = "scheduler";
		this.action = "notification";
		this.nType = nType;
	}

	_recheck(objSession, objNotif) {
		return this.nType == objNotif.nType;
	}
}

// коллекция приложений
class AppCore {

	constructor(options) {
		const isDeveloperMode = options.isDevMode; // режим разработчика
		const dName = options.dName; // доменное имя приложения
		// коллекция приложений
		this.arrAppCollection = [];
		this.dictAppCollection = {};
		this.tg = null;
		/**
		 * @type {SessionManager}
		 */
		this.sMan = null;
		this.fMan = null; //ссылка на файловый репозиторий
		this.pMan = null;
		this.dbX = null; // контекст prisma
		// обработчики команд
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
		 * Задать менеджер сессий
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
		// запустить все приложения
	async start(settings) {
		try {
			const THIS = this;

			for (var i = 0; i < this.arrAppCollection.length; i++) {
				var app = this.arrAppCollection[i];
				// активация триггеров приложения
				this.turnOnTriggers(app);
			}

			// привязать всё что нужно к ТГ
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

			for (i = 0; i < this.arrAppCollection.length; i++) {
				app = this.arrAppCollection[i];
				// активация триггеров приложения
				await app.loadData(settings);
			}

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
					return x.recheck(s, ctx);
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
						return x.recheck(s, ctx);
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
				const instance = botAppConfig.newInstance();
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
					return trigger.recheck(s, s.getAppState());
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

	// отправить оповещение в приложение
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
				// запускаем нужное приложение, соответствующее найденным триггерам
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
}



module.exports={
	TGEventTrigger,
	ActionTrigger,
	TGMessageEventTrigger,
	TGCallbackEventTrigger,
	TGCommandEventTrigger,
	AppEventTrigger,
	CallEventTrigger,
	NotificationTrigger,
	AppCore,
}