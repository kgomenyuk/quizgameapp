/*eslint no-console: 0, no-unused-vars: 0, no-undef:0, no-process-exit:0, new-cap:0*/
/*eslint-env node, es6 */
/*eslint require-await: "error"*/ 
const I18n = require("i18n-nodejs");
const mdb = require("../data/db");
const { UIScreen, UIButton } = require("./UIScreen");

// application state object
class AppStateObject {
	constructor(appName){
		this.name = appName; // название приложения
		this.isShared = false; // сессия является общей для нескольких пользователей
		this.autoDrop = true; // можно автоматически удалить
		this.data = null;// данные приложения
		this.screens = []; // информация об интерфейсе (сообщениях)
		this.screensDict = {};

		this.bMessages = [];
	}
	// найти внутреннее представление сообщения
	getScreen(messageId){
		return this.screensDict[""+messageId];
	}
	addScreen(messageId, screen){
		this.screens.push(screen);
		this.screensDict[""+messageId]=screen;
	}

	startScreen(){
		this.bMessages = [];
	}
	
	// сохранить текущий интерфейс
	toScreen(message, tag){
		this.bMessages.push({ message:message, tag:tag });
	}

	commitScreen(messageId, mode){
		var screen = new UIScreen();
		screen.setMode(mode);
		screen.setMessages(this.bMessages);
		this.screens.push(screen);
		this.screensDict[messageId + ""] = screen;
	}
}

 class UserProfile{
	constructor(){
		this.userId = null;
		this.isScheduled = false;
		this.nextScheduleTime = null;
		this.scheduleMode = null;
		this.tZMin = null;
	}
}

// a session of single user
class SessionObject {
	constructor(sessMan){
		// current application
		this.app = "";
		this.appHist = []; // история с указанием приложения
		/**
		 * @type {Object<string, AppStateObject>}
		 */
		this.dictAppStates = {}; // словарь состояний приложений AppStateObject
		this.arrAppStates = [];
		this.hist = []; // история обращений к сессии
		this.started = new Date(); // время начала сессии пользователя
		this.lastActive = new Date();
		this.sMan = sessMan; // ссылка на менеджер сессий
		this.userId = null; // идентификатор пользователя
		this.commonData = {};// общий объект данных для сессии
		this.isPublic = false;// пользователь работает в публичном чате
		this.exceptions = [];
		this.objAppWatch = {};// [what] = app[]	
		this.core = null;
		/**
		 * @type {I18n}
		 */
		this.loc = null; //локализация
	}

	/**
	 * Получить локализованное наименование для метки
	 * @param {String} tag 
	 */
	t = (tag)=>{
		return this.loc.__(tag);
	};
	
	logError(err){
		this.exceptions.push({ 
			uid: this.userId,
			time: new Date(),
			ex: err.message
		});
		console.log(`${this.userId} ${err.message}`);
	}
	
	
	// получить объект с данными, который присоединяется к сессии
	getDataObject(){
		return this.commonData;
	}
	
	getAppCore(){
		return this.sMan.getAppCore();
	}
	
	// получить состояние текущего приложения
	getAppState(){
		try{
			return this.dictAppStates[this.app];
		}catch(e){
			return null;
		}
	}
	/** Find state for specific application
	 * 
	 * @param {string} appCode 
	 * @returns {AppStateObject}
	 */
	getAppStateFor=(appCode)=>{
		try{
			return this.dictAppStates[this.app];
		}catch(e){
			return null;
		}
	}
	setApp(app){
		this.app = app;
	}
	getApp(){
		return this.app;
	}
	clearApp(){
		this.setApp("");
		
	    //delete messageTrigger["u" + userId];
	}
	
	// посчитать количество состояний в каждой сессии
	mapperCountStates(){
		return this.arrAppStates.map(x => x.name);
	}

	/**
	 * wait for a message
	 * @param {string} inApp application codename
	 * */
	watchMessage(inApp){
		var app_ = inApp==null?this.app:inApp;
		// включить ожидание сообщения для текущего приложения
		var arr = this.objAppWatch["message"];
		if(arr!=null){
			
		}else{
			this.objAppWatch["message"] = [];
			arr = this.objAppWatch["message"];
		}
		if(arr.indexOf(app_) == -1){
			arr.push(app_);
		}
	}
	
	unwatchMessage(inApp){
		// выключить ожидание сообщения для текущего приложения
		var app_ = inApp==null?this.app:inApp;
		var arr = this.objAppWatch["message"];
		if(arr!=null){
			var i = arr.indexOf(app_);
			if(i>-1){
				arr.splice(i, 1);
			}
		}else{
			arr = [];
		}
	}
	
	/**
	 * получить список приложений, которые ждут сообщение от данного пользователя
	 * */
	getWatchMessageApps(){
		if(this.objAppWatch.message != null){
			return this.objAppWatch.message.map(x=>x);
		}else{
			return [];
		}
	}
	
	/**
	 * включить ожидание rjkk,'rf' для данного пользователя и приложения
	 * @param {string} inApp
	 * */
	watchCallback(inApp){
		// включить ожидание коллбэка для текущего приложения
		var app_ = inApp==null?this.app:inApp;
		var arr = this.objAppWatch["callback"];
		if(arr!=null){
			
		}else{
			this.objAppWatch["callback"] = [];
			arr = this.objAppWatch["callback"];
		}
		if(arr.indexOf(app_) == -1){
			arr.push(app_);
		}
	}
	
	/**
	 * 
	 * @param {string} inApp 
	 */
	unwatchCallback(inApp){
		// выключить ожидание коллбэка для текущего приложения
		var app_ = inApp==null?this.app:inApp;
		var arr = this.objAppWatch["callback"];
		if(arr!=null){
			var i = arr.indexOf(app_);
			if(i>-1){
				arr.splice(i, 1);
			}
		}else{
			arr = [];
		}
	}
	
	/**
	 * получить список приложений, которые ждут коллбэк от данного пользователя
	 * */
	getWatchCallbackApps(){
		if(this.objAppWatch.callback != null){
			return this.objAppWatch.callback.map(x=>x);
		}else{
			return [];
		}
	}
	
	// очистить объект данных, который относится к сессии
	clearDataObject(){
		this.commonData = { };
	}
	
	
	// отметить продолжение сессии
	proceed(){
		this.lastActive = new Date();
		this.hist.push(this.lastActive);
		this.appHist.push({app: this.app, ts: this.lastActive});
		// ограничение - 30 записей
		if(this.hist.length > 30){
			this.hist.splice(0, 1);
			this.appHist.splice(0, 1);
		}
	}
	
	// войти в приложение. Если пользователь уже сидит в этом приложении, то будет возвращено true
	enterApp(appCode){
		const continuous = this.app === appCode;
		if(continuous == false){
			this.commonData.previous = this.app;
		}
		this.app = appCode;
		return continuous;
	}
	
	// есть ли состояние для приложения?
	isAppStateValid(){
		// есть ли текущее приложение?
		if(this.app === "" || this.app === null){ return false; }
		// есть ли данные для текущего приложения?
		if(this.dictAppStates[this.app] === null){ return false; }
		// есть приложение и его данные - всё окей
		return true;
	}
	
	// удалить все состояния приложений, которые отмечены как автоматически удаляемые
	flushAppStates(){
		var list = [];
		for (var i=0; i<this.arrAppStates.length; i++) {
			if(this.arrAppStates[i].autoDrop===false){
				list.push(this.arrAppStates[i]);
			}else{
				delete this.dictAppStates[this.arrAppStates[i].name];
			}
		}
		
		this.arrAppStates = null;
		this.arrAppStates = list;
	}
	
	// удалить состояние и убрать метку текущего приложения
	dropCurrentState(){
		const a = this.app;
		this.appHist.push({app: this.app, ts: new Date(), dropped: true});
		delete this.dictAppStates[this.app];
		this.clearApp();
		this.commonData.previous = "";
		console.log("app " + a + " was dropped");
	}
	
	
	// записать состояние приложения
	createAppState(stateObj){
		// удалить лишние объекты состояний
		this.flushAppStates();
		// объект с данными приложения нужно записать в словарь
		var state = new AppStateObject(this.app);
		state.data = stateObj;
		this.dictAppStates[this.app] = state;
		this.arrAppStates.push(state);
		return state;
	}
	
	// если приложение отличается, то тогда будет вызвана ошибка
	appCheck(appName){
		if(this.app !== appName){
			throw "Current application has changed unexpectedly";
		}
	}
	
	// получить профиль текущего пользователя
	async getProfile(){
		const d_u = await mdb.getProfile(this.userId);
		if(d_u == null ){
			// профиль не найден
			return null;
		}else{
			const u = new UserProfile();
			u.userId = d_u.id;
			u.tZMin = d_u.timezone_mm;
			return u;
		}
	}
}

class SessionManager {
	constructor(){
		this.dictSessions = {}; // словарь сессий пользователей
		this.arrSessions = []; // массив сессий
		this.core = null; // ссылка на коллекцию приложений
		
		this.usersStaff = {};  // пользователи-администраторы
		this.started = new Date();// время начала работы менеджера сессий
	}
	// инициализация менеджера. db - ссылка на базу данных
	async init() { // возможно, придётся это переделать
		// инициализация менеджера сессий
		var admins = await mdb.getStaff();
		if(admins != null) {
			this.usersStaff = admins
				.map(x=>x.id)
				.reduce((p, x)=> { 
					p[this.getIUId(x)] = { }; 
					return p; 
				}, { });
		}else{
			this.usersStaff = null;
		}
	}
	
	getSessionCount(){
		return this.arrSessions.length;
	}
	
	// внутреннее представление идентификатора пользователя
	getIUId(id){
		return "u" + id;
	}
	
	// подсчёт состояний приложений
	countStates(){
		return this.arrSessions.reduce((p,x) => { 
			x.mapperCountStates().forEach(x2 => {
				if(p[x2] == null){ p[x2] = 0; }
				p[x2]++;
			});
			return p;
		}, {});
	}
	
	// считать существующую сессию, если она есть в памяти приложения
	/**
	 * 
	 * @param {number} uid 
	 * @returns {SessionObject}
	 */
	fetch(uid){
		let iuid = this.getIUId(uid);
		return this.dictSessions[iuid];
	}
	

	// returns SessionObject
	async newSession(user){
		const uid = user.id;
		let iuid = this.getIUId(uid);
		var obj = this.fetch(uid);
		if(!obj){ 
			// вписать в БД
			var dbuser = await mdb.ensureUser(user);
			obj = new SessionObject(this);
			obj.userId = uid; // идентификатор пользователя сессии
			obj.user = dbuser;
			// register session in manager
			this.dictSessions[iuid] = obj;
			this.arrSessions.push(obj);
		}else{
			obj.proceed();
		}
		
		// здесь может быть код инициализации сессии из БД
		//
		// --
		return obj;
	}
	
	setAppCore(c){
		this.core = c;
	}
	getAppCore(){
		return this.core;
	}
	
	
	// код для работы с телеграмом
	// получить номер пользователя ТГ из сообщения или запроса
	/**
	 * Get TG user ID from context - message or callback
	 * ctx.sysUserId is also supported
	 */
	getUserId(ctx){
		if(ctx == null){
			return 0;
		}
		// пользователь указан вручную без контекста
		if(ctx.sysUserId != null){
			return ctx.sysUserId;
		}
		if(ctx.message != null){
			if(ctx.message.from != null){
				return ctx.message.from.id;
			}else{
				return 0;
			}
		}else if (ctx.callbackQuery != null){
			if(ctx.callbackQuery.from != null){
				return ctx.callbackQuery.from.id;
			}else{
				return 0;
			}
		}else{
			return 0;
		}
	}

	getUser(ctx){
		var u = null;
		if(ctx == null){
			return null;
		}
		// пользователь указан вручную без контекста
		if(ctx.sysUserId != null){
			return {id: ctx.sysUserId}
		}
		if(ctx.message != null){
			if(ctx.message.from != null){
				u = ctx.message.from;
			}else{
				return null;
			}
		}else if (ctx.callbackQuery != null){
			if(ctx.callbackQuery.from != null){
				u = ctx.callbackQuery.from;
			}else{
				return null;
			}
		}else{
			return null;
		}

		return {
			id:u.id,
			fname:u.first_name,
			sname:u.last_name,
			lang:u.language_code,
			login:u.username,
			isBot: u.is_bot
		};
	}
	
	// сделать объект сессии из контекста телеграма
	async tg(ctx, core){
		var sender = this.getUser(ctx);
		var sess = await this.newSession(sender);
		//sess.setAppCore(core);
		if(ctx!=null && ctx.chat!=null){
			if(ctx.chat.id < 0){
				sess.isPublic = true;
			}else{
				sess.isPublic = false;
			}
		}
		return sess;
	}
}

module.exports= { 
	SessionManager,
	AppStateObject,
	UserProfile,
	SessionObject,
};