const { AppBase } = require("../lib/AppBase");
const Uuid = require("uuid");
const { asoCourses } = require("./asoCourses");
const { SessionObject, SessionManager } = require("../lib/Sessions");
const { Context } = require("telegraf");

const { TGCommandEventTrigger, TGCallbackEventTrigger, TGMessageEventTrigger } = require("../lib/Triggers");
const { UIMessage } = require("../lib/UIScreen");
const { MCourse, MStudent } = require("../data/model_appCourses");
const { Int32 } = require("mongodb");



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
		var trCmdaddC = new TGCommandEventTrigger("trCmdaddC", "addc", null) ;
		trCmdaddC.handlerFunction = this.step01_01;
		var trCmdintro = new TGCommandEventTrigger("trCmdintro", "intro", null);
		trCmdintro.handlerFunction = this.step03_01;
		var trMsgCourseName = new TGMessageEventTrigger("trMsgCourseName",  (x, y, s) => s.state == "01_02");
		trMsgCourseName.handlerFunction = this.step01_02;
		var trMsgCourseCancel = new TGCallbackEventTrigger("trMsgCourseCancel", null, "courses\!addc01_cancel");
		trMsgCourseCancel.handlerFunction = this.step01_cancel;
		var trCbCourseSelect = new TGCallbackEventTrigger("trCbCourseSelect", null, "cm\!0301\!");
		trCbCourseSelect.handlerFunction = this.step03_02;
		var trCbCourseOK = new TGCallbackEventTrigger("trCbCourseOK", null, "courses\!addc02_ok");
		trCbCourseOK.handlerFunction = this.step02;
		var trMsgStudentName = new TGMessageEventTrigger("trMsgStudentName", (x, y, s) => s.state == "03_03");
		trMsgStudentName.handlerFunction = this.step03_03;
		return [
			trCmdaddC, trMsgCourseName, trCbCourseOK, trMsgCourseCancel, trCmdintro, trCbCourseSelect, trMsgStudentName

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
		state.state = "01_02"
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
	/**
	 * Handle game2 command
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoCourses} state 
	 */
	async step01_cancel(s, ctx, state) {
		const screen = s.uiInside("ADD_COURSE");
		const msg = screen.getMessage("START");
		// msg.hideAllButtons();
		screen.deleteMessage(ctx, "START");
		await screen.updateMessage(ctx, "START");
		return false;
	}

	/**
	 * Handle game2 command
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoCourses} state 
	 */
	async step03_01(s, ctx, state) {
		var msgDef =
			`# COMMUNICATION
## REGISTER_COURSE
Добрый день, {{ USERNAME |Имя | }}!
Пожалуйста, выберите курс из списка:
{{ ? | Список курсов | }}
===
{{ ? | | BTNS_LIST }}`;
		var c = await MCourse.find({}).exec();
		var d = c[0].courseName;
		let buttons = c
			.map((t) => { return { text: t.courseName, code: "cm!0301!" + t.courseNumber }; });
		const msg = s.uiReg3(msgDef, true);
		msg.setPlaceholder("USERNAME", ctx.from.first_name);
		msg.setBtnPlace("BTNS_LIST", buttons);
		const p = msg.buttonPlaces.find(b => b.reference == 'BTNS_LIST');
		p.maxInLine = 1;
		msg.createButtonsTable();
		const screen = s.uiInside("COMMUNICATION");
		const userId = ctx.from.id;

		await screen.postMessage(ctx, "REGISTER_COURSE", userId);
		s.watchCallback();
		return true;
	}

	/**
		 * Handle game2 command
		 * @param {SessionObject} s 
		 * @param {Context} ctx 
		 * @param {asoCourses} state 
		 */

	async step03_02(s, ctx, state) {
		let courseCode
			= ctx.callbackQuery.data
		let courseQuerry = String(courseCode).split('!')
		let courseId = Number(courseQuerry[courseQuerry.length - 1])
		state.course = await MCourse.findOne({ courseNumber: courseId }).exec()
		var msgDef =
			`# COMMUNICATION
## REGISTER_NAME
Теперь укажите ваше ФИО, если вы неправильно ввели курс введите команду /re `;
		const msg = s.uiReg3(msgDef, true);
		const screen = s.uiInside("COMMUNICATION");
		const userId = ctx.from.id;
		await screen.postMessage(ctx, "REGISTER_NAME", userId);
		state.state = "03_03";
		s.watchMessage();
		return true;
	}
	/**
		 * Handle game2 command
		 * @param {SessionObject} s 
		 * @param {Context} ctx 
		 * @param {asoCourses} state 
		 */
	async step03_03(s, ctx, state) {
		var msgDef =
			`# COMMUNICATION
## REGISTER_FINISH
Спасибо! Теперь вы будете получать информацию о ваших оценках в этот чат, если вы неправильно ввели ФИО или курс введите команду /re`;
		const screen = s.uiInside("COMMUNICATION");		
		const msg = s.uiReg3(msgDef, true);
		
		const userId = ctx.from.id;
		await screen.postMessage(ctx, "REGISTER_FINISH", userId);
		s.watchMessage();
		let name = ctx.message.text
		
		await MStudent.create({ studentName: name, studentNumber: await MStudent.countDocuments() + 1, courseName: state.course.courseName })
	
		return false;
	}


}

module.exports = {
	AppCourses
};