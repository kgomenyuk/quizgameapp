/*eslint no-console: 0, no-unused-vars: 0, no-undef:0, no-process-exit:0, new-cap:0*/
/*eslint-env node, es6 */
/*eslint require-await: "error"*/ 
const I18n = require("i18n-nodejs");
const mdb = require("../data/db");
//const { AppCore } = require("./appCore");
const { UIScreen, UIButton, UIMessage } = require("./UIScreen");
const { Context } = require("telegraf");

// application state object
class AppStateObject {
	/**
	 * managed interface
	 * @type {[UIScreen]}
	 */
	screens = []; 

	/**
	 * tag of the screen currently being edited
	 */
	screenTag = "";

	/**
	 * @type { UIScreen }
	 */
	currentScreen = null;

	bMessages = [];

	constructor(appName){
		this.name = appName; // application name
		this.isShared = false; 
		this.autoDrop = true; 
		this.data = null; // app-specific data
		this.screensDict = {};
	}
	/**
	 * 
	 * @param {number} messageId 
	 * @returns {UIScreen}
	 */
	getScreen(messageId){
		try{
			return this.screens.find(s=>s.messages.find(m=>x.message == messageId) != null );
		}catch(e){
			return null;
		}
	}

	addScreen(messageId, screen){
		this.screens.push(screen);
		this.screensDict[""+messageId]=screen;
	}

	getScreenByTag(screenTag){
		return this.screens.find(s=>s.screenTag == screenTag );
	}

	/**
	 * 
	 * @param {String} tag 
	 * @returns {UIScreen}
	 */
	startScreen = (tag) => {
		this.screenTag = tag;
		this.bMessages = [];
		var screen = new UIScreen();
		screen.screenTag = tag;

		var idx = this.screens.findIndex(x=>x.screenTag == tag);
		if(idx >= 0){
			this.screens.splice(idx, 1);
		}
		this.screens.push(screen);

		this.screensDict[this.screenTag + ""] = screen;

		return screen;
	}

	setCurrentScreen = (tag) => {
		this.currentScreen = this.findScreen(tag);
	}

	/**
	 * Find the screen object for the tag provided
	 * @param {String} screenTag screen tag
	 * @returns {UIScreen}
	 */
	findScreen = (screenTag) => {
		return this.screens.find(s => s.screenTag == screenTag);
	}
	
	/**
	 * Save or replace a message ID
	 * @param { Number } messageId 
	 * @param { String } messageTag 
	 * @param {String} text
	 * @param {[{id:string, name:string}]} items
	 */
	toScreen(messageId, messageTag, text, items=[]){
		if(messageTag == null){
			this.bMessages.push({ message:messageId, tag:"main", text:text, array: items });
		}else{
			this.bMessages.push({ message:messageId, tag:messageTag, text:text, array:items });
		}
	}

	/**
	 * Save or replace a message
	 * @param { UIMessage } msg 
	 */
	toScreen2(msg){
		
		this.bMessages.push(msg);
	}

	commitScreen(){
		var screen = this.currentScreen;
		screen.setMessages(this.bMessages);
		//this.screens.push(screen);
		//this.currentScreen = screen;
	}

	/** Remove buttons
	 * 
	 * @param {Context} ctx 
	 * @param {String} tag message tag
	 */
	dropButtons = async (ctx, tag) => {
		var screen = this.currentScreen;
		await screen.dropButtonsTg(tag, ctx);
	}

	/**
	 * Append a new line to the message
	 * @param {Context} ctx 
	 * @param {String} tag 
	 * @param {String} line 
	 */
	addLine = async (ctx, tag, line) => {
		var screen = this.currentScreen;
		await screen.addLineTg(tag, ctx, line);
	}

	dropPost = async (ctx, tag) => {
		var screen = this.currentScreen;
		await screen.dropPostTg(tag, ctx);
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
	commonData = {};// common object for all sessions related to the same application
	/**
	 * @type {SessionManager}
	 */
	sMan; // ссылка на менеджер сессий
	/**
	 * Debug mode
	 * @type {Boolean}
	 */
	debug = false;
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
		this.sMan = sessMan;
		this.userId = null; // идентификатор пользователя
		
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
	 * Chat ID
	 * @type {Number}
	 */
	chatId = 0;

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
	
	/**
	 * Clear shared data
	 */
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
		//this.commonData.previous = "";
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

	/**
	 * assign a tag to current interface state
	 * @param {String} uiTag tag of a scene
	 * @returns {UIScreen}
	 */
	uiInside = (uiTag)=>{
		var s = this.getAppState();
		var screen = s.getScreenByTag(uiTag);
		s.bMessages = [];
		if(screen == null){
			screen = s.startScreen(uiTag);
			screen.chatId = this.chatId;
			s.commitScreen();
		}
		s.setCurrentScreen(uiTag);
		return screen;
	}

	/**
	 * 
	 * @param {Number} msgId 
	 * @param {String} msgTag 
	 * @param {[{id:string, value:string}]} items Optional. Array of items to display in a message
	 */
	uiReg = (msgId, msgTag, text, items=[])=>{
		var s = this.getAppState();
		var screen = s.currentScreen;
		if(screen == null){
			s.startScreen("default");
			s.setCurrentScreen("default");
		}
		s.toScreen(msgId, msgTag, text, items);
	}

	/**
	 * 
	 * @param { UIMessage } msg 
	 */
	uiReg2 = (msg)=>{
		var s = this.getAppState();
		var screen = s.currentScreen;
		if(screen == null){
			s.startScreen("default");
			s.setCurrentScreen("default");
		}
		s.toScreen2(msg);
	}

	/**
	 * Add a new message with text definition
	 * @param { String } msgDef
	 * @returns { UIMessage } Message created
	 */
	uiReg3 = (msgDef, createButtons = false)=>{
		var msgGrId = UIScreen.getIdFromDefinition(msgDef);
		var s = this.getAppState();
		var screen = s.currentScreen;
		if(screen == null){
			screen = s.startScreen(msgGrId);
			screen.chatId = this.chatId;
			s.setCurrentScreen(msgGrId);
		}
		const msg = screen.fromTextDefinition(msgDef, createButtons);
		screen.setMessages([msg]);
		//s.toScreen2(msg);
		return msg;
	};


	uiRefresh = async (ctx, msgTag, inlineKeyboard, dropKeyboard) => {
		var s = this.getAppState();
		var screen = s.currentScreen;
		await screen.refreshPostTg(msgTag, ctx, inlineKeyboard, dropKeyboard);
	};

	uiDropPostIfExists = async (ctx, msgTag) => {
		var s = this.getAppState();
		var screen = s.currentScreen;
		if(screen.getMessage(msgTag)!=null){
			await screen.dropPostTg(msgTag, ctx);
		}
	};

	uiCommit = () => {
		var s = this.getAppState();
		var screen = s.currentScreen;
		if(screen != null){
			s.commitScreen();
		}
	};


	/**
	 * Get current screen
	 * @returns { UIScreen }
	 */
	uiGetCurrentScreen = () => {
		return this.getAppState().currentScreen;
	};
}

class SessionManager {
	/** disctionary of sessions
	 * @type {Object<string, SessionObject>}
	 */
	dictSessions = {}; 
	/** array of sessions
	 * @type {[SessionObject]}
	 */
	arrSessions = [];
	/** app collection
	 * @type {AppCore}
	 */
	core = null;
	/**
	 * @type {Object<String, any>} Shared application data
	 */
	dictAppSharedData = {};
	constructor(){
		this.usersStaff = {};  // пользователи-администраторы
		this.started = new Date();// время начала работы менеджера сессий
	}

	/**
	 * 
	 * @param {String} appAlias 
	 * @param {(store:Object)=>void} fx 
	 */
	addShared = (appAlias, fx) => {
		var collection = this.dictAppSharedData[appAlias];
		if(collection==null){
			collection = {};
			this.dictAppSharedData[appAlias] = collection;
		}
		fx(collection);
	}

	getSharedCollection = (appAlias) => {
		return this.dictAppSharedData[appAlias];
	}
	
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
	
	_newSessionObject(x){
		return new SessionObject(x);
	}

	// returns SessionObject
	async newSession(user){
		const uid = user.id;
		let iuid = this.getIUId(uid);
		var obj = this.fetch(uid);
		if(!obj){ 
			// вписать в БД
			var dbuser = await mdb.ensureUser(user);
			obj = this._newSessionObject(this);
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