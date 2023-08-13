
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

module.exports = {
    FxArrayHandler,
    ActionTrigger,
    AppEventTrigger,
    CallEventTrigger,
    TGCallbackEventTrigger,
    TGCommandEventTrigger,
    TGEventTrigger,
    TGMessageEventTrigger
};