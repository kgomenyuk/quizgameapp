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
		"0103_SRV_QUIT":{
			ru:"Опрос был отменён",
			en:"The survey was cancelled"
		},
		"0301_SRV_ANS": {
			ru: "Ваш ответ",
			en: "Your answer"
		}
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
		
		var settings = await super._loadApplicationSettings(a);
		
		// transfer settings
		this.availableSurveyCodes=settings.availableSurveyCodes;
		this.filterGroupId=settings.filterGroupId;
		this.startCommand = settings.startCommand;
		if(this.startCommand==null){
			this.startCommand = "ask";
		}
		this.refCode = settings.refCode;

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
		var alias = this.currentAlias;

		// start the survey
		var trCmdaddC = new TGCommandEventTrigger("trCmdaddC", this.startCommand, null);
		trCmdaddC.handlerFunction = this.step01_01;
		trgs.push(trCmdaddC);
		
		var trCbLang = new TGCallbackEventTrigger("trCbLang", null, this.currentAlias + "_0102_" );
		trCbLang.handlerFunction = this.step01_02;
		trgs.push(trCbLang);

		var trCbQuit = new TGCallbackEventTrigger("trCbQuit", null, this.currentAlias + "_0102close");
		trCbQuit.handlerFunction = this.step_quit;
		trgs.push(trCbQuit);

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

				var trgBack = new TGCallbackEventTrigger("survey_step_" + idx + "_b", (x,y, z)=>{
					return z.curField == pos
						&& ( y.data.endsWith(alias + "_0103back") || y.data.endsWith(alias + "_0201back") );
				});
                trgBack.handlerFunction = this.step_go_back;

				var trgQuit = new TGCallbackEventTrigger("survey_step_" + idx + "_q", (x,y, z)=>{
					return z.curField == pos
						&& ( y.data.endsWith(alias + "_0103quit") || y.data.endsWith(alias + "_0201quit") );
				});
                trgQuit.handlerFunction = this.step_quit;

				var trgSkip = new TGCallbackEventTrigger("survey_step_" + idx + "_skip", (x,y, z)=>{
					return z.curField == pos
						&& ( y.data.endsWith(alias + "_0103skip") || y.data.endsWith(alias + "_0201skip") );
				});
                trgSkip.handlerFunction = this.step_skip;

				if(field.fieldType == "message"){
					// message
					var trgFieldAnswer = new TGMessageEventTrigger("survey_step_" + idx + "_answer", 
							(x,y, z)=>z.curField == pos && z.expected == "answer");
					trgFieldAnswer.handlerFunction = this.step_get_answer;
					trgs.push(trgFieldAnswer);
				}

				if(field.fieldType == "choice"){
					// choice
					//var options = field.fieldOptions;
					//for (let index = 0; index < options.length; index++) {
						//const element = options[index];
					//}
					var trgFieldAnswerO = new TGCallbackEventTrigger("survey_step_" + idx + "_opt", 
							(x,y, z)=>z.curField == pos && z.expected == "choice" && y.data.startsWith(alias + "_0201_"));
					trgFieldAnswerO.handlerFunction = this.step_get_answer_option;
					trgs.push(trgFieldAnswerO);
				}
				
				trgs.push(trgBack);
				
				trgs.push(trgQuit);
				trgs.push(trgSkip);
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
{{ ${ this.currentAlias }_0102close | ⏏️ | btn_close }}`;

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
{{ ? | 1 | btn_surveys }}
{{ ${ this.currentAlias }_0102close | ⏏️ | btn_close }}`;

		var list = this.surveys.map(x=>{
			return {
				code: this.currentAlias + "_0103_" + x.surveyCode, 
				text: x.description[lang]
			};
		});


		
		const screen = s.uiInside("SURVEY");
		const prev = screen.getMessage("START");
		prev.setPlaceholder("ANSWER", "\n"+`${this.texts["0102_LANG_CHOSEN"][state.lang]}`);
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
		
		state.rewriteAnswers = survey.rewriteAnswers;
		state.refCode = survey.refCode;
		
		const screen = s.uiInside("SURVEY");
		const prev = screen.getMessage("LIST");
		prev.setPlaceholder("ANSWER", "\n" + survey.description[state.lang]);
		prev.hideAllButtons();
		await screen.updateMessage(ctx, "LIST");

		// start 
		//state.nextField = 1;
		state.curField = 0;
		state.nextField = 1;
		state.maxField = survey.surveyFields.length;
		

		await this.stateCreateAnswer(state);


		return this.step_show_field(s, ctx, state);
		// start from position = 1

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
	state.currentSurvey.lang = state.lang;
	//state.currentSurvey.rewriteAnswers = state.rewriteAnswers;
	state.currentSurvey.refCode = state.refCode;
	
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

	
	}


	/**
	 * next field
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

		if(cfield.fieldType == "message"){
			return this.step_show_field_message(s, ctx, state);
		}

		if(cfield.fieldType == "choice"){
			return this.step_show_field_options(s, ctx, state);
		}

	}


	/**
	 * next field
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_show_field_message(s, ctx, state){
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

		state.prevField = state.curField;
		state.curField = state.nextField;
		state.nextField = state.curField + 1;
		
		const prefix = this.currentAlias + "_0103";
		const lang = state.lang;
		
		// show the prompt related to one field in a survey
		var msgDef =
`# SURVEYFIELD
## FIELD${ state.curField }
{{ FTEXT | Field prompt | Default text }} {{ ANSWER | user's answer | }}
===
{{ ${ prefix + "back" } | ⬅️ | btn_back }}{{ ${ prefix + "skip" } | ⏩ | btn_skip }}{{ ${ prefix + "quit" } | ⏏️ | btn_quit }}`;
		
		const userId = ctx.from.id;
		
		const screen = s.uiInside("SURVEYFIELD");
		const msg = s.uiReg3(msgDef, false);
		msg.setPlaceholder("FTEXT", cfield.fieldDescription[lang]);

		// if we have previous then hide its buttons
		if(state.prevField > 0){
			const prev = screen.getMessage(`FIELD${ state.prevField }`);
			//prev.setPlaceholder("ANSWER", ">>>>>");
			prev.hideAllButtons();
			await screen.updateMessage(ctx, `FIELD${ state.prevField }`);
		}
		if(state.curField == 1){
			var btnBack = msg.buttonPlaces.find(x=>x.reference == "btn_back");
			btnBack.buttons[0].hide();
		}
		if(state.curField > state.maxField){
			var btnSkip = msg.buttonPlaces.find(x=>x.reference == "btn_skip");
			btnSkip.buttons[0].hide();
		}
		
		// show a new field
		msg.createButtonsTable();
		await screen.postMessage(ctx, `FIELD${ state.curField }`, userId);

		state.expected = "answer";

		state.fieldObject.createdTime = new Date();
		state.fieldObject.fieldCode = cfield.fieldCode;
		state.fieldObject.position = cfield.position;

		s.watchMessage();
		return true;
	}

	/**
	 * next field with options
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_show_field_options(s, ctx, state){
		var survey = this.surveys.find(x=>x.surveyCode == state.surveyCode);
		var cfield = null;
		if(survey!=null){
			cfield = survey.surveyFields.find(f=>f.position == state.nextField);
			state.currentField = cfield;
			if(cfield == null){
				throw new Error("Field unknown");	
			}
		}else{
			throw new Error("Survey not found");
		}

		state.prevField = state.curField;
		state.curField = state.nextField;
		state.nextField = state.curField + 1;
		
		const prefix = this.currentAlias + "_0201";
		const lang = state.lang;
		
		// show the prompt related to one field in a survey
		var msgDef =
`# SURVEYFIELD
## FIELD${ state.curField }
{{ FTEXT | Field prompt | Default text }} {{ ANSWER | user's answer | }}
===
{{ ? | | btn_options }}
{{ ${ prefix + "back" } | ⬅️ | btn_back }}{{ ${ prefix + "skip" } | ⏩ | btn_skip }}{{ ${ prefix + "quit" } | ⏏️ | btn_quit }}`;
		
		const userId = ctx.from.id;
		
		const screen = s.uiInside("SURVEYFIELD");
		const msg = s.uiReg3(msgDef, false);
		msg.setPlaceholder("FTEXT", cfield.fieldDescription[lang]);

		//
		var btns = [];
		var options = cfield.fieldOptions;
		for (let index = 0; index < options.length; index++) {
			const element = options[index];
			btns.push({
				code:this.currentAlias + "_0201_" + element.code,
				text:element.text[state.lang]
			});
		}
		msg.setBtnPlace("btn_options", btns);

		// if we have previous then hide its buttons
		if(state.prevField > 0){
			const prev = screen.getMessage(`FIELD${ state.prevField }`);
			//prev.setPlaceholder("ANSWER", ">>>>>");
			prev.hideAllButtons();
			await screen.updateMessage(ctx, `FIELD${ state.prevField }`);
		}
		if(state.curField == 1){
			var btnBack = msg.buttonPlaces.find(x=>x.reference == "btn_back");
			btnBack.buttons[0].hide();
		}
		if(state.curField > state.maxField){
			var btnSkip = msg.buttonPlaces.find(x=>x.reference == "btn_skip");
			btnSkip.buttons[0].hide();
		}
		
		// show a new field
		msg.createButtonsTable();
		await screen.postMessage(ctx, `FIELD${ state.curField }`, userId);

		state.expected = "choice";

		state.fieldObject.createdTime = new Date();
		state.fieldObject.fieldCode = cfield.fieldCode;
		state.fieldObject.position = cfield.position;

		s.unwatchMessage();
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

		if(survey!=null){
			
		}else{
			throw new Error("Survey not found");
		}

		// do we have the next field?
		// or maybe not
		if(state.maxField > state.curField ){
			return this.step_show_field(s, ctx, state);
		}else{
			// finish
			return this.step_finish(s, ctx, state);
		}
	}

	/**
	 * Receive the answer
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_get_answer_option(s, ctx, state){
		var survey = this.surveys.find(x=>x.surveyCode == state.surveyCode);
		var cfield = state.currentField;
		var prefix = this.currentAlias + "_0201_";

		var txt = ctx.callbackQuery.data;
		txt = txt.substr(prefix.length);
		var optname = cfield.fieldOptions.find(x=>x.code == txt).text[state.lang];
		state.fieldObject.fieldText = optname;
		state.fieldObject.fieldOption = txt;

		await ctx.reply(this.texts["0301_SRV_ANS"][state.lang] + ":\n" + optname);

		await this.stateWriteAnswer(state);

		if(survey!=null){
			
		}else{
			throw new Error("Survey not found");
		}

		// do we have the next field?
		// or maybe not
		if(state.maxField > state.curField ){
			return this.step_show_field(s, ctx, state);
		}else{
			// finish
			return this.step_finish(s, ctx, state);
		}
	}

	/**
	 * Go back
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_go_back(s, ctx, state){
		
		state.nextField = state.curField - 1;

		return this.step_show_field(s, ctx, state);
		
	}

	/**
	 * Skip
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_skip(s, ctx, state){

		state.fieldObject.fieldText = "--SKIPPED--";
		await this.stateWriteAnswer(state);

		if(state.curField == state.maxField){
			return await this.step_finish(s, ctx, state);
		}else{
			return await this.step_show_field(s, ctx, state);
		}
		
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

		// overwrite previous answers
		if(state.rewriteAnswers == true){
			// clear old answers
			await MSurveyFieldsAnswers.deleteMany({
				$and:[
					{ uid: state.uid },
					{ surveyCode: state.surveyCode },
					{ _id: {$ne:state.id} },
					{ refCode: state.refCode }
				]
			});
		}

		var screen = s.uiInside("SURVEYFIELD");

		const prev = screen.getMessage(`FIELD${ state.curField }`);
		prev.hideAllButtons();
		await screen.updateMessage(ctx, `FIELD${ state.curField }`);

		screen = s.uiInside("SURVEY");

		const msg = s.uiReg3(msgDef, false);
		await screen.postMessage(ctx, "FINISH", ctx.from.id);
		
		return false;
		
	}

	/**
	 * Cancel survey
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	async step_quit(s, ctx, state){
		if(state.lang == "" || state.lang == null){
			state.lang = "en";
		}

		var msgDef =
`# SURVEY
## FINISH
${ this.texts["0103_SRV_QUIT"][state.lang] }
`;

		var screen = s.uiInside("SURVEYFIELD");
		const prev = screen.getMessage(`FIELD${ state.curField }`);
		if(prev != null){
			prev.hideAllButtons();
			await screen.updateMessage(ctx, `FIELD${ state.curField }`);

			// delete data
			await MSurveyFieldsAnswers.deleteOne({
				_id:state.id
			});
		}

		screen = s.uiInside("SURVEY");
		var msg = s.uiReg3(msgDef, false);
		await screen.postMessage(ctx, "FINISH", s.userId);

		return false;		
	}


}

module.exports = {
	AppSurveyFields
};