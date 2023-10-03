const { AppBase } = require("../lib/AppBase");
const Uuid = require("uuid");
const { SessionObject, SessionManager } = require("../lib/Sessions");
const { Context } = require("telegraf");

const { TGCommandEventTrigger, TGCallbackEventTrigger, TGMessageEventTrigger } = require("../lib/Triggers");
const { UIMessage } = require("../lib/UIScreen");
const { MSurveyFields, MSurveyFieldsAnswers } = require("../data/model_appSurveyFields");
const { asoSurveyFields } = require("./asoSurveyFields");
const { ObjectId } = require("mongodb");



class AppSurveyFields extends AppBase {

	texts = {
		"0102_LANG_CHOSEN":{
			ru:"Выбран русский язык",
			en:"You have chosen English"
		},
		"0102_SRV_CHOOSE":{
			ru:"Выберите нужный опрос",
			en:"Choose a survey"
		},
		"0103_BTN_BACK":{
			ru:"Назад",
			en:"Back"
		},
		"0103_BTN_SKIP":{
			ru:"Пропустить",
			en:"Skip"
		},
		"0103_BTN_QUIT":{
			ru:"Завершить",
			en:"Quit"
		},
	};

	_init() {
		this.taskId = "";
		this.taskCode = "";

		this.app = "sfields";
		this.isPublicAllowed = false;
	}

	// settings:
    filterGroupId = ""; // users must belong to this group
    availableSurveyCodes = []; // all surveys to load
	refCode = ""; //
	surveys = []; // surveys

	
    startCommand = "survey"; // command that triggers the survey


	/**
	 * 
	 * @param {SessionManager} sman 
	 */
	_requireSharedData = (sman) => {

	}

    _loadApplicationSettings = async (a) =>{
		if(this.availableSurveyCodes.length == 0) {
			throw new Error("Survey codes not set");
		}

		var forms = await MSurveyFields.find({
			$and:[
				{
					surveyCode: {
						$in: this.availableSurveyCodes
					}
				}, {
					refCode: this.refCode
				}
			]
		})
		.exec();

		if(forms == null){
			throw new Error("Survey not found");
		}

		this.surveys = forms.map(x=>x.toObject());

		
    }

	_getTriggers () {

		var trgs = [];

		// start the survey
		var trCmdaddC = new TGCommandEventTrigger("trCmdaddC", this.startCommand, null);
		trCmdaddC.handlerFunction = this.step01_01;
		trgs.push(trCmdaddC);
		
		var trCbLang = new TGCallbackEventTrigger("trCbLang", null, this.currentAlias + "_0102_" );
		trCbLang.handlerFunction = this.step01_02;
		trgs.push(trCbLang);

		var trCbSurvey = new TGCallbackEventTrigger("trCbSurvey", null, this.currentAlias + "_0103_" );
		trCbSurvey.handlerFunction = this.step01_03;
		trgs.push(trCbSurvey);

		

        var surveys = this.surveys;
		if(surveys == null){
			throw new Error("Survey is empty");
		}
        for (let index = 0; index < surveys.length; index++) {
            const s = surveys[index];

            var pfx = this.currentAlias+ "." + s.surveyCode + ".";

            s.surveyFields.forEach((field, idx) => {
                // each field => three triggers
				//   back
				//   skip
				//   quit
                var pos = field.position;
                //var trg = new TGMessageEventTrigger("survey_step_" + idx + "_m", (x,y, z)=>z.nextField == pos);
                //trg.handlerFunction = this.step_show_field;

				var trgBack = new TGCallbackEventTrigger("survey_step_" + idx + "_b", (x,y, z)=>z.nextField == pos);
                trgBack.handlerFunction = this.step_go_back;

				var trgFieldAnswer = new TGMessageEventTrigger("survey_step_" + idx + "_answer", 
						(x,y, z)=>z.nextField == pos && z.expected == "answer");
                trgFieldAnswer.handlerFunction = this.step_get_answer;

				//trgs.push(trg);
				trgs.push(trgBack);
				trgs.push(trgFieldAnswer);

            });
        }


		
		return trgs;
	}

	// initial session object
	_newSessionDataObject() {
		return new asoSurveyFields();
	}

	_checkBeforeRun(s, t) {
		return true;
	}


	// загрузить данные из БД
	async _loadData() {



		return true;
	}


/**
 * typical message for one step
 * 
 * # FIELDS
 * ## FIELD_<FIELDNAME>
 * Please, enter {{ DESCRIPTION | Description of a field |  }}:
 * ===
 * {{ <alias>_<survey>_back | Back | btnBack}}
 * {{ <alias>_<survey>_quit | Quit | btnQuit}}
 * {{ <alias>_<survey>_finish | Finish | btnFinish}}
 * 
 */

/**
 * Language of the survey
 * 
 * # FIELDS
 * ## LANG
 * Choose a language:
 * ===
 * {{ <alias>_<survey>_en | EN | btnEn}} {{ <alias>_<survey>_ru | RU | btnRu}}
 * {{ <alias>_<survey>_ru | Cancel | btnClose}}
 * 
 */

// 1. Choose survey from the list

// 2. Go through the questions

// 2.1. Every question: Show text and ajust feedback option

// 2.2. Show Back button

// 2.3. Show quit button

// 2.4. Save the result in the database


	// ALL HANDLERS 

	/**
	 * Choose language
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step01_01(s, ctx, state) {


		
		const msgDef =
`# SURVEY
## START
Choose your language {{ANSWER | | }}
===
{{ ? | 2 | btn_forms }}
{{ ${ this.currentAlias }_0102_close | Close | btn_close }}`;

		const screen = s.uiInside("SURVEY");
		const msg = s.uiReg3(msgDef, false);

		msg.setBtnPlace("btn_forms", [
			{ code: this.currentAlias + "_0102_ru", text: "RU" }, 
			{ code: this.currentAlias + "_0102_en", text: "EN" }
		] );

		msg.createButtonsTable();

		// find the available forms

		const userId = ctx.from.id;
		await screen.postMessage(ctx, "START", userId);
		s.watchCallback();
		
		return true
	}

	/**
 * Set language and show the list
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoSurveyFields} state 
 */
	async step01_02(s, ctx, state) {
		const prefix = this.currentAlias+"_0102_";
		const lang = ctx.callbackQuery.data.substring(prefix.length);
		const userId = ctx.from.id;
		
		state.lang = lang;

		var msgDef =
`# SURVEY
## LIST
${this.texts["0102_SRV_CHOOSE"][lang]} {{ ANSWER | | }}
===
{{ ? | 1 | btn_surveys }}`;

		var list = this.surveys.map(x=>{
			return {
				code: this.currentAlias + "_0103_" + x.surveyCode, 
				text: x.description[lang]
			};
		});


		
		const screen = s.uiInside("SURVEY");
		const prev = screen.getMessage("START");
		prev.setPlaceholder("ANSWER", `${this.texts["0102_LANG_CHOSEN"][state.lang]}`);
		prev.hideAllButtons();
		await screen.updateMessage(ctx, "START");

		const msg = s.uiReg3(msgDef, false);
		msg.setBtnPlace("btn_surveys", list);
		msg.createButtonsTable();

		await screen.postMessage(ctx, "LIST", userId);
		s.watchCallback();

		return true;
	}


/**
 * Set survey code
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoSurveyFields} state 
 */
	async step01_03(s, ctx, state) {
		const prefix = this.currentAlias + "_0103_";
		const srv = ctx.callbackQuery.data.substring(prefix.length);
		const userId = ctx.from.id;
		
		state.surveyCode = srv;
		state.uid = ctx.from.id;
		var survey = this.surveys.find(x=>x.surveyCode == srv);
		

		
		const screen = s.uiInside("SURVEY");
		const prev = screen.getMessage("LIST");
		prev.setPlaceholder("ANSWER", survey.description[state.lang]);
		prev.hideAllButtons();
		await screen.updateMessage(ctx, "LIST");

		// start 
		state.nextField = 1;
		state.maxField = survey.surveyFields.length;
		

		await this.stateCreateAnswer(state);

		return this.step_show_field(s, ctx, state);

		//s.watchCallback();
		//return true;
	}

/**
 * Set survey code
 * @param {asoSurveyFields} state 
 */
async stateCreateAnswer(state){
	state.currentSurvey.createdTime = new Date();
	state.currentSurvey.uid = state.uid;
	state.currentSurvey.surveyCode = state.surveyCode;
	state.currentSurvey._id = new ObjectId();
	
	var r = await MSurveyFieldsAnswers.create(state.currentSurvey);

	
	state.id = state.currentSurvey._id;
}

/**
 * Set survey code
 * @param {asoSurveyFields} state 
 */
	async stateWriteAnswer(state){
		var fld = state.currentSurvey.surveyFields
			.find(x=>x.fieldCode == state.fieldObject.fieldCode);

		if(fld == null){
			// push
			state.currentSurvey.surveyFields.push(
				{
					createdTime: state.fieldObject.createdTime,
					fieldCode: state.fieldObject.fieldCode,
					fieldText: state.fieldObject.fieldText,
					position: state.fieldObject.position,
					fieldOption:state.fieldObject.fieldOption
				}
			);
		}else{
			// change
			fld.createdTime = state.fieldObject.createdTime;
			fld.fieldCode = state.fieldObject.fieldCode;
			fld.fieldText = state.fieldObject.fieldText;
			fld.position = state.fieldObject.position;
			fld.fieldOption = state.fieldObject.fieldOption;
		}

		await MSurveyFieldsAnswers.updateOne(
			{ _id: state.id },
			state.currentSurvey,
			{upsert: true});

		/*{
			fieldCode: state.fieldObject.fieldCode, 
			position: Number, 
			fieldText: String,
			fieldOption: String,
			createdTime: Date
		}*/
	}


	/**
	 * Handle game2 command
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_show_field(s, ctx, state){
		var survey = this.surveys.find(x=>x.surveyCode == state.surveyCode);
		var cfield = null;
		if(survey!=null){
			cfield = survey.surveyFields.find(f=>f.position == state.nextField);
			if(cfield == null){
				throw new Error("Field unknown");	
			}
		}else{
			throw new Error("Survey not found");
		}

		var pos = state.nextField;
		const prefix = this.currentAlias + "_0103_";
		const lang = state.lang;
		
		// show the prompt related to one field in a survey
		var msgDef =
`# SURVEYFIELD
## FIELD${pos}
{{ FTEXT | Field prompt | Default text }} {{ ANSWER | user's answer | }}
===
{{ ${ prefix + "back" } | ${ this.texts["0103_BTN_BACK"][lang] } | btn_back }}
{{ ${ prefix + "skip" } | ${ this.texts["0103_BTN_SKIP"][lang] } | btn_skip }}
{{ ${ prefix + "skip" } | ${ this.texts["0103_BTN_QUIT"][lang] } | btn_quit }}`;
		
		const userId = ctx.from.id;
		state.curField = pos;
		
		
		const screen = s.uiInside("SURVEYFIELD");
		const msg = s.uiReg3(msgDef, true);
		msg.setPlaceholder("FTEXT", cfield.fieldDescription[lang]);

		// if we have previous then hide its buttons
		if(state.prevField > 1){
			const prev = screen.getMessage(`FIELD${pos-1}`);
			//prev.setPlaceholder("ANSWER", ">>>>>");
			prev.hideAllButtons();
			await screen.updateMessage(ctx, `FIELD${pos-1}`);
		}
		
		// show a new field
		
		await screen.postMessage(ctx, `FIELD${pos}`, userId);

		state.expected = "answer";

		state.fieldObject.createdTime = new Date();
		state.fieldObject.fieldCode = cfield.fieldCode;
		state.fieldObject.position = cfield.position;

		s.watchMessage();
		return true;
	}

	/**
	 * Receive the answer
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_get_answer(s, ctx, state){
		var survey = this.surveys.find(x=>x.surveyCode == state.surveyCode);
		var cfield = state.currentField;

		var txt = ctx.message.text;
		state.fieldObject.fieldText = txt;

		await this.stateWriteAnswer(state);
		
		state.nextField += 1;

		if(survey!=null){
			
		}else{
			throw new Error("Survey not found");
		}

		// do we have the next field?
		// or maybe not
		if(state.maxField >= state.nextField){
			return this.step_show_field(s, ctx, state);
		}else{
			// finish
			return this.step_finish(s, ctx, state);
		}
	}

	/**
	 * Handle game2 command
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_go_back(s, ctx, state){
		var survey = this.surveys.find(x=>x.surveyCode == state.surveyCode);
		var cfield = null;
		if(survey!=null){
			cfield = survey.surveyFields.find(f=>f.position == state.nextField);
			if(cfield == null){
				throw new Error("Field unknown");	
			}
		}else{
			throw new Error("Survey not found");
		}

		var pos = state.nextField;
		// show the prompt related to one field in a survey
		var msgDef =
`# SURVEYFIELD
## FIELD${pos}
${this.texts["0102_SRV_CHOOSE"]}
{{ FTEXT | Field prompt | Default text }}
===
{{ st!field!${state.nextField - 1} | Back | btnBack }}`;
		
		const prefix = this.currentAlias + "_0102_";
		//const lang = ctx.callbackQuery.data.substring(prefix.length);
		const userId = ctx.from.id;
		
		//state.lang = lang;
		
	}

	/**
	 * The survey is finished
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_finish(s, ctx, state){
		var survey = this.surveys.find(x=>x.surveyCode == state.surveyCode);
		
		var msgDef =
`# SURVEY
## FINISH
Thank you!
`;

	const screen = s.uiInside("SURVEY");
	const msg = s.uiReg3(msgDef, false);
	await screen.postMessage(ctx, "FINISH", ctx.from.id);
	
	return false;
		
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
	AppSurveyFields
};