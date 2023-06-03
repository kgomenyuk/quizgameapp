const {UIScreen, UIButton} = require("../lib/UIScreen");
const i18n = require("i18n-nodejs");
const { AppCore } = require("./appCore");
const { SessionObject, AppStateObject } = require("./Sessions");
/*
список действий - набор доступных функций в привязке к условиям выполнения
*/
class AppBase {
	// базовый класс для приложения
	constructor(code, params){
		this.params = params;
		this.app = "Unknown";
		this.triggers = this.getTriggers(code); // набор триггеров для приложения
		this.actions = []; // массив определенных в приложении действий
		this.isPublicAllowed = false; // работа в публичном чате
		this.isPrivateAllowed = false; // работа с приватном чате
		this.messageOnPPError = false; // отправить сообщение при возникновении ошибки, связанной с неправильным вызовом
		this.runCount = 0; // количество выполнений функции run
		this.errorCount = 0;// количество обработанных ошибок
		this.isSystem = false;// true обозначает выполнение команд в состоянии isOnline = false
		this.core = null;// ссылка на коллекцию приложений
		this.appCode = code;
		this._init(code); 
		
		this.app = this.app + (code == null ? "" : "_" + code);

		this.dbContext = null;

		// добавить возможность локализации
		this.i18nLang = {};
		
		//this.core = core;// менеджер приложений
		// реакция на какое-то действие в боте
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
					throw "invalid call";
				}
				// --
				
				console.log(">> entered");
				s.proceed();
				const continuous = s.enterApp(this.app);
				
				// если состояния приложения еще нет, то надо его создать
				if(continuous === false){
					// создать объект состояния приложения и записываем в сессию
					const obj = this.newSessionDataObject();
					s.createAppState(obj);         
					// добавить локализатор
					var lang = s.user.lang;
					var l = this.loc(lang);
					s.loc = l;
					// считать персонализированные настройки из БД. Создать запись с настройками в БД, если ее еще не нет.
					const userSettings = await this.loadUserSettings(s.userId);
					if(userSettings!=null){
						obj.userSettings = userSettings;
					}
				}
				
				// состояние приложения
				const appState = s.getAppState();
				// добавить дополнительные данные
				if(ctx.callbackQuery){
					var screen = appState.getScreen(ctx.callbackQuery.message.message_id);
					// кнопка?
					if(screen==null){ 
						screen = new UIScreen();
						appState.addScreen(screen);
					}
					screen.fromTGMessage(ctx.callbackQuery.message, ctx.callbackQuery.data);
				}else if(ctx.message){
					var screen = appState.getScreen(ctx.message.message_id);
					// кнопка?
					if(screen==null){ 
						screen = new UIScreen(); 
						screen.fromTGMessage(ctx.message);
						screen.setMode("command");
						appState.addScreen(ctx.message.message_id, screen);
					}
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

	//запросить данные через контекст бд
	async _loadUserSettings(userId, dbcontext){
		// надо найти нужную функцию
		// app<appname>EnsureGet
		var fx =  dbcontext["app" + this.app + "ReadSettings"];
		if(fx == null){
			return {};
		} else {
			return await fx(userId);
		}
	}
	// получить данные пользователя
	async loadUserSettings(userId){
		var dbcontext = this.dbContext;
		if(dbcontext == null){
			return null;
		}else{
			return await this._loadUserSettings(userId, dbcontext);
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
	}
	
	// инициализация приложения. здесь надо задать начальные настройки приложения
	_init(){
		
	}
	// загрузить начальные данные, которые нужны для успешного выполнения приложения
	async _loadData(settings){
		return true;
	}
	async _run(session, trigger, appState, ctx){
		if(trigger.handlerFunction != null){
			const hf = trigger.handlerFunction.bind(this);
			return await hf(session, ctx, appState);
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
	
	getTriggers(){
		return this._getTriggers();
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
	
	setAppCore(core){
		this.core = core;
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
	getSessionOfUser=async(uid)=>{
		var c = this.getAppCore();
		var s = c.sMan.fetch(uid);
		if(s!=null){
			return s;
		}else{
			return null;
		}
	}
}


module.exports.AppBase = AppBase;