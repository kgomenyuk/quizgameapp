const { AppBase } = require("../lib/AppBase");
const Uuid = require("uuid");
const { asoCourses } = require("./asoCourses");
const { SessionObject, SessionManager } = require("../lib/Sessions");
const { Context } = require("telegraf");

const { TGCommandEventTrigger, TGCallbackEventTrigger, TGMessageEventTrigger } = require("../lib/Triggers");
const { UIMessage } = require("../lib/UIScreen");
const { MCourse } = require("../data/model_appCourses");



class AppCourses extends AppBase {
	_init() {
		this.taskId = "";
		this.taskCode = "";

		this.app = "courses";
		this.isPublicAllowed = false;
	}

	getState() {

	}

	/**
	 * 
	 * @param {SessionManager} sman 
	 */
	_requireSharedData = (sman) => {

	}

	_getTriggers() {


		// start the game
		var trCmdaddC = new TGCommandEventTrigger("trCmdaddC", "addc", null);
		trCmdaddC.handlerFunction = this.step01_01;

		var trMsgCourseName = new TGMessageEventTrigger("trMsgCourseName");
		trMsgCourseName.handlerFunction = this.step01_02;

		var trCbCourseOK = new TGCallbackEventTrigger("trCbCourseOK", null, "courses\!addc02_ok");
		trCbCourseOK.handlerFunction = this.step02;

		return [
			trCmdaddC, trMsgCourseName, trCbCourseOK
		];
	}

	// initial session object
	_newSessionDataObject() {
		return new asoCourses();
	}

	_checkBeforeRun(s, t) {
		return true;
	}


	// загрузить данные из БД
	async _loadData() {



		return true;
	}





	// ALL HANDLERS 

	/**
	 * Handle game2 command
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoCourses} state 
	 */
	async step01_01(s, ctx, state) {
		const msgDef =
`# ADD_COURSE
## START
Введите название курса:
===
{{ courses!addc01_cancel | Отмена | BTN_CANCEL }}`;
		
		const msg = s.uiReg3(msgDef, true);
		const screen = s.uiInside("ADD_COURSE");
		const userId = ctx.from.id;
		await screen.postMessage(ctx, "START", userId);
		s.watchCallback();
		s.watchMessage(); // waiting for a message
		return true
	}

	/**
 * Handle game2 command
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoCourses} state 
 */
	async step01_02(s, ctx, state) {
		var msgDef =
`# ADD_COURSE
## RESULT
Курс {{ CNAME | Название курса | }} добавлен.
Номер курса - {{ CNUM | Номер | }}.
===
{{ courses!addc02_ok | ОК | BTN_OK }}`;

		const courseName = ctx.message.text;
		const userId = ctx.from.id;
		const n = await MCourse.countDocuments();
		await MCourse.create({ courseName: courseName, courseNumber: n + 1 });
		const screen = s.uiInside("ADD_COURSE");
		const msg = s.uiReg3(msgDef, true);
		msg.setPlaceholder("CNAME", courseName);
		msg.setPlaceholder("CNUM", n + 1);
		await screen.postMessage(ctx, "RESULT", userId);
		s.unwatchMessage(); // waiting for a message
		s.watchCallback();
		return true
	}
/**
 * Handle game2 command
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoCourses} state 
 */
	async step02(s, ctx, state) {
		const screen = s.uiInside("ADD_COURSE");
		const msg = screen.getMessage("RESULT");
		msg.hideAllButtons();
		await screen.updateMessage(ctx, "RESULT");
		return false;
	}

}

module.exports = {
	AppCourses
};