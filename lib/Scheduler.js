const axios = require("axios");

// schedule management
var uuid = require("uuid");
const mdb = require("../db/model");
const { Util } = require("./util.js");
const {
	Worker,
	workerData
} = require('worker_threads');
const { use } = require("passport/lib");
const { isDate } = require("util/types");

function axiosBase(baseURL){
    return axios.create({
        baseURL: baseURL,
    });
}

// скласс, описыващий настройки одного оповещения
class Notification{
	constructor(id){
		this.id = id;
		this.nState = "N";
		this.userId = null;
		this.nType="";
		this.isPersisted = true;
		this.isActive = false;
		if(id == null){
			this.id = uuid.v4();
			this.nState = "N";
			this.isPersisted = false;
		}
		this.nClass = "";
		this.nInterval = "";
		this.datePlanning = false;
		this.appId = "";
		this.lastPlannedAt = null;
		
		// данные планирования
		this.planned = {
			id: null,
			plannedAt: null,
			sentAt: null,
			stateId: null,
    		isSent: false,
    		isSelected: false,
    		createdOn: null
		};

		// данные обработки оповещения
		this.processing = {
			service_mode: false, // режим обработки путем отправки запроса HTTP
			is_processed: false,
			has_error: false,
			processing_code: ""// где была выполнена обработка
		};
	}
	
	// установить режим планирования по точному времени и дате
	setDatePlanningMode(){
		this.datePlanning = true;
	}
	
	setIntervalPlanningMode(){
		this.datePlanning = false;
	}
	
	// задать основные данные, относящиеся к приложению и типу оповещения
	setMainData(appId, typeId, y, m, d, hh, mm, ss){
		this.appId = appId;
		this.nType = typeId;
		this.nInterval = Util.formatDateTimeString(y, m, d, hh, mm, ss);
	}
	
	setMainDataStr(appId, typeId, sInterval){
		this.appId = appId;
		this.nType = typeId;
		this.nInterval = sInterval;
	}
	
	setUser(id){
		this.userId = id;
	}
	
	// установить текущий статус настройки оповещения
	setState(state){
		switch(state){
			case "N":
				this.nState = state;
				break;
			case "S":
				this.nState = state;
				break;
			case "E":
				this.nState = state;
				break;
			case "C":
				this.nState = state;
				break;
			default:
				throw "state " + state + " is invalid";
		}
	}
	
	// сохранить в БД
	async save(){
		
	}
	
	
	async postProcess(schm){
		// выполнить постобработку оповещения
		return await this._postProcess(schm);
	}
	
	// постобработка оповещения
	async _postProcess(schm){
		return true;
	}
	
	canSchedule(){
		return this._canSchedule();
	}
	
	_canSchedule(){
		return true;
	}
	
	// проверка корректности введнных параметров уведомления
	isCorrect(){
		//
		if(this.userId != null && this.state != "" && this.nInterval!="" && this.nClass !="" && this.nType !="" && this.appId!="" && this.nInterval.length == 14){
			return true;
		}
		return false;
	}
}

// класс оповещения, в которм предусмотрено повторение планирования
class RecurringNotification extends Notification{
	constructor(id){
		super(id);
		this.nClass = "R";
	}
	
	async _postProcess(schm){
		// перепланировать
		
		return true;
	}
	
	_canSchedule(){
		// если статус N, S
		if( ( this.nState == "N" || this.nState == "S" ) && this.isActive == true){
			return true;
		}else{
			return false;
		}
	}
}

// класс одноразовых оповещений
class OneTimeNotification extends Notification{
	constructor(id){
		super(id);
		this.nClass = "S";
	}
	
	async _postProcess(schm){
		return true;
	}
	
	_canSchedule(){
		// если статус N, S
		if( ( this.nState == "N" ) && this.isActive == true){
			return true;
		}else{
			return false;
		}
	}
}

// объект для управления оповещениями
class ScheduleManager{
	constructor(){
		// функция для отправки оповещения за пределы оповещений
		this.delegateDispatchNotification = async (notif) => { 
			return true; 
		};
		this.processTimer = null;// процесс таймера
		this.isNotifOnline = true;// разрешена ли автоматическая обработка оповещений или нет
		this.serviceMode = false; // выполняется ли в режиме сервиса или нет
		this.appHandlerURL = null;// ссылка на обработчик оповещений (в режиме сервиса)
	}
	
	// создать новое уведомление
	createNewNotification(classId){
		// создать и записать в базу данных
		var n = null;
		switch(classId){
			case "S":
				n = new OneTimeNotification();
			break;
			case "R":
				n = new RecurringNotification();
			break;
			default:
				n = null;
		}
		if(n != null){
			// надо сделать запись свойств в базу данных
			
		}
		return n;
	}

	// создать и запланировать уведомление
	async createNotification(userId, app, nType, sInterval, isDateTime, repeat){
		return await this.repCreateNotification(userId, app, nType, sInterval, isDateTime, repeat);
	}
	
	// общий метод для создания оповещений/уведомлений
	async repCreateNotification(userId, app, nType, sInterval, isDateTime, repeat){
		var n = new Notification();
		if(repeat == true){
			n = new RecurringNotification();
		}else{
			n = new OneTimeNotification();
		}

		n.setUser(userId);
		n.setMainDataStr(app, nType, sInterval);
		
		if(isDateTime == true){
			n.setDatePlanningMode();
		}

		const nid = await this.persistNotification(n);
		if(n.isPersisted == false){
			throw "could not persist";
		}
		var a = await this.activateNotification(n);
		if(a == false){
			throw "could not activate notification";
		}
		// запланировать заданное оповещение
		await this.scheduleNotification(n);
		return n;
	}


	// запланировать одноразовое оповещение с указанием относительного времени запуска, пользователя и типа оповещения
	async repCreateSingleNotificationRel(userId, app, nType, sInterval){
		var n = new OneTimeNotification();
		n.setUser(userId);
		n.setMainDataStr(app, nType, sInterval);
		const nid = await this.persistNotification(n);
		if(n.isPersisted == false){
			throw "could not persist";
		}
		var a = await this.activateNotification(n);
		if(a == false){
			throw "could not activate notification";
		}
		// запланировать заданное оповещение
		await this.scheduleNotification(n);
		return n;
	}
	
	// запланировать повторяющееся уведомление
	async createRecurringNotificationRel(userId, app, nType, sInterval){
		return await this.repCreateRecurringNotificationRel(userId, app, nType, sInterval);
	}

	// запланировать разовое уведомление
	async createSingleNotificationRel(userId, app, nType, sInterval){
		return await this.repCreateSingleNotificationRel(userId, app, nType, sInterval);
	}

	// запланировать повторяющееся оповещение с указанием относительного времени запуска, пользователя и типа оповещения
	async repCreateRecurringNotificationRel(userId, app, nType, sInterval){
		var n = new RecurringNotification();
		n.setUser(userId);
		n.setMainDataStr(app, nType, sInterval);
		const nid = await this.persistNotification(n);
		if(n.isPersisted == false){
			throw "could not persist";
		}
		var a = await this.activateNotification(n);
		if(a == false){
			throw "could not activate notification";
		}
		// запланировать заданное оповещение
		await this.scheduleNotification(n);
		return n;
	}
	
	// найти оповещения, которые надо обработать
	async getOutdatedNotifications(){	
		var arrNotifPlans = await mdb.getOutdatedNotifications();
		
		// поменять время с учетом часового пояса
		var result = arrNotifPlans.map(this.getNotificationInstance);
		return result;
	}
	
	// сохранить данные оповещения в БД
	// будет выполнено обновление полей в n
	async persistNotification(n){
		// проверки
		if(n.isCorrect()===false){
			throw "incorrect notification";
		}
			
		n.isPersisted = await mdb.saveNotification(n);
		return n.id;
	}
	// активировать оповещение с настройками
	async activateNotification(n){
		if(await mdb.activateNotification(n)==true){
			n.isActive=true;
			return true;
		}else{
			return false;
		}
	}
	
	// найти оповещения заданного пользователя в будущем с учетом настроек уведомлений
	async getScheduledNotifications(userId, notifType){
		
		var arrObjSurvey = await mdb.getScheduledNotifications(userId, notifType);

		var mapped = arrObjSurvey.map(x=>this.getNotificationInstance(x));
		// поменять время с учетом часового пояса
		return mapped;
	}
	
	// запланировать уведомление
	async scheduleNotification(n){
		// сначала проверить, что в настройках
		if(n.id != "" && n.canSchedule() == true){
			// затем будет выполнено создание строки с планируемым оповещением
			const out_obj = 
				await mdb.scheduleNotification(n.id);
			const out_result = out_obj;
			
			//if(out_result != "OK"){
			//	throw "notification scheduler: " + out_result;
			//}

			return out_result;
		}else{
			throw "incorrect notification state";
		}
	}
	
	// сформировать экземпляр оповещения по данным
	getNotificationInstance(data){
		var obj = null;
		if(data.notif.notif_class_id == "R"){
			// повторяющиеся оповещения
			obj = new RecurringNotification(data.notif.notif_id);
		}
		if(data.notif.notif_class_id == "S"){
			// одноразовые оповещения
			obj = new OneTimeNotification(data.notif.notif_id);
		}
		
		if(obj != null){
			// получилось определить класс оповещения
			obj.setState(data.notif.notif_state_id);
			
			/*if(id==null){
				this.id = uuid.v4();
				this.nState = "N";
				this.isPersisted = false;
			}else{
			*/
				
			obj.appId = data.notif.app_id;
			obj.nState = data.notif.notif_state_id;
			obj.userId = data.notif.user_id;
			obj.nType = data.notif.notif_type_id;
			obj.nClass = data.notif.notif_class_id;
			obj.isActive = data.notif.is_active;
			obj.isPersisted = true;
			obj.datePlanning = data.notif.is_datetime_plan;
			obj.lastPlannedAt = data.notif.time_last_planned;//Util.createDateAsUTCFromString(data.notif.time_last_planned);
			obj.nInterval = data.notif.plan_time_span_utc;
			
			if(data.notif_plan_id != null){
				// план оповещения есть
				obj.planned.id = data.notif_plan_id;
				obj.planned.plannedAt = (data.time_planned);
				obj.planned.sentAt = (data.time_sent);
				obj.planned.stateId = data.notif_plan_state_id;
				obj.planned.isSelected = data.is_selected;
				obj.planned.createdOn = (data.time_created);
			}
		}
		// добавляем данные запланированного оповещения
		return obj;
	}
	
	// пометить оповещение как отправленное и обработанное
	async markNotificationAsSent(notif){ 
		if (notif == null || notif.id == null || notif.planned == null){
			return false;
		}
		
		const out_obj = await mdb.markNotifAsSent(notif.planned.id); 
		const out_result = out_obj.out_result;
		const out_state = out_obj.out_state;
		
		if( out_obj==null || out_result != ""){
			throw "notification scheduler: when trying to mark as sent: " + out_result;
		}
		
		notif.nState = out_state;
		notif.planned.isSent = true;
		
		return true;
	}
	
	// основной метод обработки оповещений
	async processNotifications(){
		var notifs = await this.getOutdatedNotifications();
		// направить оповещения в приложения
		
		for (var i = 0; i < notifs.length; i++) {
			var notif = notifs[i];
			if(i > 0 && i % 28 === 0){ // no more than 30 messages per second
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
			// надо переправить дальше
			
			// является ли обработка оповещения успешной?
			var res = await this.delegateDispatchNotification(notif);
		
			// запланировать еще раз, если это регулярное оповещение. Если единичное, то не надо.
			var ppRes = await this.postProcess(notif);
			if(ppRes == false){
				// была ошибка
				await this.setNotifError(notif);
			}
		}
		
		return notifs;
	}
	
	// отметить ошибку
	async setNotifError(n){
		await mdb.setNotifError(n.id);
	}
	
	// выполнить постобработку оповещения
	async postProcess(notif){
		try{
			// пометить оповещение как выполненное
			await this.markNotificationAsSent(notif);
			switch(notif.nClass){
				case "R":
					// повторяющееся оповещение
					if(notif != null){
						var nres = await this.scheduleNotification(notif);
					}
					break;
				case "S":
					// одноразовое оповещение
					// еще можно сделать запись в лог
					break;
			}
			return true;
		}catch(e){
			// ошибка в процессе обработки оповещения
			return false;
		}
	}
	
	// соединить функцию маршрутизации оповещений
	connectNotifications(service_mode, fx_on_dispatch_notification, url){
		if(service_mode == true){
			this.appHandlerURL = url;
			this.serviceMode = service_mode;
			// отправить запрос по адресу url, переданному в составе агрументов функции
			this.delegateDispatchNotification = async (notif) => {
				try{
					const axReq = axiosBase(this.appHandlerURL);
					const axRes = await axReq.post("/", {
						notif:{
							id: notif.id,
							appId: notif.appId,
							userId: notif.userId,
							nType: notif.nType,
							nClass: notif.nClass,
						}
					}, 
					{
						headers: {
							"content-type":"application/json"
						},
						timeout: 5000
					});
					if(axRes.data.result == "ok"){
						// успешная обработка
						return true;
					}else{
						// не было обработки, либо была ошибка
						return false;
					}
				}catch(exe){
					if(exe.code == "ECONNREFUSED"){
						// не получается подключиться к приложению
						console.log("Can not connect to application");
					}
					if(exe.code == "ECONNABORTED"){
						// превышено время ожидания ответа
						console.log("Application connection timeout");
					}
					return false;
				}
			};
		}else{
			this.delegateDispatchNotification = fx_on_dispatch_notification;
		}
	}
	
	// включить автоматическую обработку оповещений
	start(){
		
		this.processTimer = new Worker('./lib/scheduleWorker.js', {
			workerData: { }
		});
		const scheduler = this;
		var timer = this.processTimer;
		
		timer.on('message', async message => {
			if (message.command == "notify") {
				try {
					if(scheduler.isNotifOnline == false){
						// сервис оповещений отключн
						throw new Error("Notification service is turned off");
					}
					// отправляем накопившиеся оповещения
				await scheduler.processNotifications.bind(scheduler)();
				} catch (e) {
					console.log(e.message);
				}
				// сообщение в дочерний процесс
				timer.postMessage("continue");
			}
		});
		console.log("scheduler started");
	}
	
	// удалить оповещения
	async deleteNotifications(arrNotifs){
		await mdb.deleteNotifications(arrNotifs);
	}
	
	// удалить оповещения пользователя с заданными параметрами
	async deleteNotificationsByUser(userId, nClass, nType){
		
		const res_cnt = await mdb.deleteNotifications2(userId, nClass, nType);
		
		if(res_cnt > 0){
			// удаление произошло
			return true;
		}else{
			// удаление не выполнено по какой-то причине
			return false;
		}
	}
	
	// проверка наличия у пользователя активного регулярного оповещения
	async getRecurringNotification(userId, appId, nType){
		if(userId != null && appId != null && nType != null){
			var notifs  = await mdb.getScheduledNotifications(userId, nType, appId, 'R');
			return notifs.map(this.getNotificationInstance);
		}else{
			throw "parameters missing";
		}
	}
}

module.exports={
	Notification,
	RecurringNotification,
	ScheduleManager,
	OneTimeNotification,
};