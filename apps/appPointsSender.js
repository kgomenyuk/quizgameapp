
// addGrade
const { AppBase } = require("../lib/AppBase");
const Uuid = require("uuid");
const { SessionObject, SessionManager } = require("../lib/Sessions");
const { Context } = require("telegraf");

const { TGCommandEventTrigger, TGCallbackEventTrigger, TGMessageEventTrigger } = require("../lib/Triggers");
const { UIMessage, UIScreen } = require("../lib/UIScreen");
const { MPoints, MPointsAudience, MPointsCategory, MPointsQuery } = require("../data/model_appPoints");
const { asoSurveyFields, asoPointsSender } = require("./asoPointsSender");
const { ObjectId } = require("mongodb");
const { MBot, MAppSettings } = require("../data/model");



class AppPointsSender extends AppBase {

	texts = {
		
	};

	_init() {
		this.taskId = "";
		this.taskCode = "";

		this.app = "grader";
		this.isPublicAllowed = false;
	}

	// settings:
	refCode = ""; // reference code
    profileCode = ""; //
	
    startCommand = "grades"; // command that triggers the survey
	//adminStartCommand = "srvadmin";


    /**
         * @type { [{pointsCode:String, calc:(Object<String, Number>)=>Number}] } 
         */
    calculatedPoints=[];

	/**
	 * 
	 * @param {SessionManager} sman 
	 */
	_requireSharedData = (sman) => {

	}

    _loadApplicationSettings = async (a) =>{
		
		var settings = await super._loadApplicationSettings(a);
		
		// transfer settings
		//this.availableSurveyCodes=settings.availableSurveyCodes;
		this.filterGroupId=settings.filterGroupId;
        this.pointsAdminId = settings.pointsAdminId;
        
		this.startCommand = settings.startCommand;
        this.myGradesCommand = settings.myGradesCommand;
        this.postPointsCommand = settings.postPointsCommand;
        this.listCommand = settings.listCommand;
        this.sendPointsCommand = settings.sendPointsCommand;
        this.postBulkPointsCommand = settings.postBulkPointsCommand;
        this.feedbackCommand = settings.feedbackCommand;
        this.sendHelpCommand = settings.sendHelpCommand;
        
		this.adminStartCommand = settings.adminStartCommand;
		if(this.adminStartCommand == null){
		  	this.adminStartCommand = "srvpoints";
		}

		if(this.startCommand == null){
			this.startCommand = "listgrades";
		}
        
        if(this.myGradesCommand == null){
            this.myGradesCommand = "mypoints";
        }

        if(this.postPointsCommand == null){
            this.postPointsCommand = "addpoints";
        }

        if(this.listCommand == null){
            this.listCommand = "listusers";
        }

        if(this.postBulkPointsCommand == null){
            this.postBulkPointsCommand = "bulkpoints";
        }

        if(this.sendPointsCommand == null){
            this.sendPointsCommand = "sendpoints";
        }

        if(this.sendHelpCommand == null){
            this.sendHelpCommand = "help";
        }

        if(this.feedbackCommand == null){
            this.feedbackCommand = this.currentAlias + "fb";
        }

		this.refCode = settings.refCode;

    }

	_getTriggers () {

		var trgs = [];
		var alias = this.currentAlias;

		// start the grading session
        var trCmdHelp = new TGCommandEventTrigger("trCmdHelp", this.sendHelpCommand, null);
		trCmdHelp.handlerFunction = this.step_help;
		trgs.push(trCmdHelp);

		var trCmdGrManager = new TGCommandEventTrigger("trCmdGrManager", this.startCommand, null);
		trCmdGrManager.handlerFunction = this.step01_01;
		trgs.push(trCmdGrManager);
		
		var trCbGrAdd = new TGCallbackEventTrigger("trCbGrAdd", null, this.currentAlias + "_0101_add" );
		trCbGrAdd.handlerFunction = this.step01_02;
		trgs.push(trCbGrAdd);

        var trCbReload = new TGCallbackEventTrigger("trCbReload", null, this.currentAlias + "_0101_reload" );
		trCbReload.handlerFunction = this.step01_04;
		trgs.push(trCbReload);

        var trMsgGrAdd = new TGMessageEventTrigger("trMsgGrAdd", 
							(x,y, z)=>z.expected == "answerGRADE");
        trMsgGrAdd.handlerFunction = this.step01_03;
		trgs.push(trMsgGrAdd);


        var trCmdPtsManager = new TGCommandEventTrigger("trCmdPtsManager", this.postPointsCommand, null);
		trCmdPtsManager.handlerFunction = this.step02_01;
		trgs.push(trCmdPtsManager);

        var trCbGrSel = new TGCallbackEventTrigger("trCbGrSel", null, this.currentAlias + "_0202_");
		trCbGrSel.handlerFunction = this.step02_02;
		trgs.push(trCbGrSel);

        var trCbGrPers = new TGCallbackEventTrigger("trCbGrPers", null, this.currentAlias + "_0203_");
		trCbGrPers.handlerFunction = this.step02_03;
		trgs.push(trCbGrPers);

        var trCbGrShow10 = new TGCallbackEventTrigger("trCbGrShow10", null, this.currentAlias + "_0204_");
		trCbGrShow10.handlerFunction = this.step02_04;
		trgs.push(trCbGrShow10);


        var trCbGrMy = new TGCommandEventTrigger("trCbGrMy", this.myGradesCommand, null);
		trCbGrMy.handlerFunction = this.step03_01;
		trgs.push(trCbGrMy);

        var trCmdList = new TGCommandEventTrigger("trCmdList", this.listCommand, null);
		trCmdList.handlerFunction = this.step04_01;
		trgs.push(trCmdList);

        var trCmdBulkPoints = new TGCommandEventTrigger("trCmdBulkPoints", this.postBulkPointsCommand, null);
		trCmdBulkPoints.handlerFunction = this.step05_01;
		trgs.push(trCmdBulkPoints);

        var trCmdSendPoints = new TGCommandEventTrigger("trCmdSendPoints", this.sendPointsCommand, null);
		trCmdSendPoints.handlerFunction = this.step06_01;
		trgs.push(trCmdSendPoints);

        var trCbGrSendPoints = new TGCallbackEventTrigger("trCbGrSendPoints", null, this.currentAlias + "_0602_");
		trCbGrSendPoints.handlerFunction = this.step06_02;
		trgs.push(trCbGrSendPoints);
        
        var trCbGrSelBulk = new TGCallbackEventTrigger("trCbGrSelBulk", null, this.currentAlias + "_0502_");
		trCbGrSelBulk.handlerFunction = this.step05_02;
		trgs.push(trCbGrSelBulk);

        var trCbGrBulkOk = new TGCallbackEventTrigger("trCbGrBulkOk", null, this.currentAlias + "_0503ok");
		trCbGrBulkOk.handlerFunction = this.step05_03_ok;
		trgs.push(trCbGrBulkOk);

        var trCbGrBulkCancel = new TGCallbackEventTrigger("trCbGrBulkCancel", null, this.currentAlias + "_0503cancel");
		trCbGrBulkCancel.handlerFunction = this.step05_03_cancel;
		trgs.push(trCbGrBulkCancel);


        var trCmdPtsFeedback = new TGCommandEventTrigger("trCmdPtsFeedback", this.feedbackCommand, null);
		trCmdPtsFeedback.handlerFunction = this.step07_01;
		trgs.push(trCmdPtsFeedback);

        var trCbFeedbackPoints = new TGCallbackEventTrigger("trCbFeedbackPoints", null, this.currentAlias + "_0702_");
		trCbFeedbackPoints.handlerFunction = this.step07_02_points;
		trgs.push(trCbFeedbackPoints);

        var trMsgFeedbackMessage = new TGMessageEventTrigger("trMsgFeedbackMessage", (x,y, z)=>z.expected == "feedbackMsg");
		trMsgFeedbackMessage.handlerFunction = this.step07_02_message;
		trgs.push(trMsgFeedbackMessage);

        var trCbFeedbackCancel = new TGCallbackEventTrigger("trCbFeedbackCancel", null, this.currentAlias + "_0702cancel");
		trCbFeedbackCancel.handlerFunction = this.step07_02_cancel;
		trgs.push(trCbFeedbackCancel);

        var trCbFeedbackFinish = new TGCallbackEventTrigger("trCbFeedbackFinish", null, this.currentAlias + "_0703");
        trCbFeedbackFinish.handlerFunction = this.step07_03;
        trgs.push(trCbFeedbackFinish);

        
        

        // security management
		var trCmdaddGr = new TGCommandEventTrigger("trCmdaddGr", this.adminStartCommand, null);
		trCmdaddGr.handlerFunction = this.step_adm_01;
		trgs.push(trCmdaddGr);

		var trCbAdmQuit = new TGCallbackEventTrigger("trCbAdmQuit", null, this.currentAlias + "_adm01close");
		trCbAdmQuit.handlerFunction = this.step_adm_quit;
		trgs.push(trCbAdmQuit);

		var trCbAdmGr = new TGCallbackEventTrigger("trCbAdmGr", null, this.currentAlias + "_adm02_");
		trCbAdmGr.handlerFunction = this.step_adm_02;
		trgs.push(trCbAdmGr);
        // -- security 

        return trgs;

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


		
		
		/*var trCbLang = new TGCallbackEventTrigger("trCbLang", null, this.currentAlias + "_0102_" );
		trCbLang.handlerFunction = this.step01_02;
		trgs.push(trCbLang);



		var trCbSurvey = new TGCallbackEventTrigger("trCbSurvey", null, this.currentAlias + "_0103_" );
		trCbSurvey.handlerFunction = this.step01_03;
		trgs.push(trCbSurvey);
		*/

		return trgs;
	}

	// initial session object
	_newSessionDataObject() {
		return new asoPointsSender();
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
	 * Saving 
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoSurveyFields} state 
	 */
	step_adm_01 = async (s, ctx, state) => {

		// activation command
		var code = this.getAppCore().botInfo.apiKey;
		code = code.substring(code.length - 10);

		const ok = ctx.message.text.indexOf(" " + code) > 0;

		if(ok == false){
			return false;
		}

		await ctx.deleteMessage(ctx.message.message_id);

		const msgDef =
`# FIELDADMIN
## START
Please, choose a group from the list: {{ANSWER | | }}
===
{{ ? | 2 | btn_forms }}
{{ ${ this.currentAlias }_adm01close | Cancel | btn_close }}`;

		const screen = s.uiInside("FIELDADMIN");
		const msg = s.uiReg3(msgDef, false);

		var groups = await MBot.findOne({ 
			botCode: this.getAppCore().botInfo.botCode 
		}, { 
			groups: 1
		 }).exec();

		 if(groups == null){
			await ctx.reply("The bot was not added to any group");
			return false;
		 }

		 groups = groups.toObject();
		 if(groups.groups.length == 0){
			await ctx.reply("The bot was not added to any group");
			return false;
		 }

		 var groupIds = groups.groups.map(x=>x.id);
		 state.groupIds = groupIds;


		 var btns = groups.groups.map(g=>{
			return {
				code: this.currentAlias + "_adm02_" + g.id,
				text: g.groupTitle
			};
		 });

		// var btnsGroups = groups.
		msg.setBtnPlace("btn_forms", btns);
		msg.createButtonsTable();
		const userId = ctx.from.id;

		await screen.postMessage(ctx, "START", userId);
		s.watchCallback();
		
		return true
	}

	/**
 * Choose group from the list
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoSurveyFields} state 
 */
	step_adm_02 = async (s, ctx, state) => {
		const prefix = this.currentAlias + "_adm02_";
		const gr = ctx.callbackQuery.data.substring(prefix.length);
		const userId = ctx.from.id;
		
		if(gr != '' && gr != null){
			await MAppSettings.updateOne({
				appAlias: this.currentAlias
			}, {
				$pull:{
					settings: { 
                        propertyName:{ 
                            $in:['filterGroupId','pointsAdminId'] 
                        } 
                    }
				}
			}).exec();

			await MAppSettings.updateOne({
				appAlias: this.currentAlias
			}, {
				$push:{
					settings: [{ 
						propertyName: 'filterGroupId', 
						propertyValue: gr 
					}, { 
						propertyName: 'pointsAdminId', 
						propertyValue: userId
					}]
				}
                
			}).exec();

			this.filterGroupId = gr;
            this.pointsAdminId = userId;
		}

		await ctx.reply("The group was set");

		return false;
	}
	

	/**
	 * Find 
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoPointsSender} state 
	 */
	step_help = async (s, ctx, state)=> {
		
		const msgDef =
`# HELPS
## COMMANDLIST
List of command:
/mypoints - return your current marks
===
`;

        const msgDefAdmins =
`# HELPSADMINS
## COMMANDLISTADMIN
List of command:
/srvpoints [10 last symbols api key] - Registration in the admin area
/srvadmin [4 last symbols api key] - registration bot in the group of students
/listgrades - command for adding groups of marks, also for reload audience
/mypoints - return your current marks
/addpoints - adding marks for students in groups of marks, didnt work without group of marks
/listusers - return current users in group
/bulkpoints [userID  mark] - adding marks for users by there ids. Between UserId and mark needs doublespace. Between marks and new userId needs /n(new row)

===
`;
        
        if(s.userId != this.pointsAdminId ){
            const screen = s.uiInside("HELPS");
            const msg = s.uiReg3(msgDef, false);
    
            const userId = ctx.from.id;
            await screen.postMessage(ctx, "COMMANDLIST", userId);
            s.watchCallback();
            
            return true;
        }

        const screen = s.uiInside("HELPSADMINS");
        const msg = s.uiReg3(msgDefAdmins, false);

        const userId = ctx.from.id;
        await screen.postMessage(ctx, "COMMANDLISTADMIN", userId);
        s.watchCallback();
        
        return true;
	}

	/**
	 * Find 
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoPointsSender} state 
	 */
	step01_01 = async (s, ctx, state)=> {

        if(s.userId != this.pointsAdminId ){
            return false;
        }
        
		var refCode = this.refCode;
        var cats = await (MPointsCategory.find({ refCode: refCode })).exec();
		if(cats != null && cats.length > 0){
			try{
				
				
			} catch (exe){
				await ctx.reply("Sorry, the bot is not available now");
				return false;
			}
		}
		
		const msgDef =
`# GRADES
## LIST
List of grades:
{{? | grades | }}
===
{{ ${ this.currentAlias }_0101_add | ADD | btn_add }}
{{ ${ this.currentAlias }_0101_del | DELETE | btn_delete }}
{{ ${ this.currentAlias }_0101_reload | RELOAD AUDIENCE | btn_reload }}`;

		const screen = s.uiInside("GRADES");
		const msg = s.uiReg3(msgDef, false);
        
        cats.forEach(x=>{
            msg.addItem(x.pointsCode, x.pointsCode );
        });

		msg.createButtonsTable();

		const userId = ctx.from.id;
		await screen.postMessage(ctx, "LIST", userId);
		s.watchCallback();

        state.refCode = this.refCode;
		
		return true;
	}

	/**
 * Add a new grade
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
	step01_02 = async (s, ctx, state) => {

        if(s.userId != this.pointsAdminId ){
            return false;
        }

		const userId = ctx.from.id;

		var msgDef =
`# GRADES
## NEW
Write the name of a new grade
===
`;

		const screen = s.uiInside("GRADES");
		const prev = screen.getMessage("LIST");
		prev.hideAllButtons();
		await screen.updateMessage(ctx, "LIST");

		const msg = s.uiReg3(msgDef, true);
		await screen.postMessage(ctx, "NEW", userId);
		s.watchMessage();

        state.expected = "answerGRADE";
		return true;
	}


/**
 * Create a new grade category
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
	step01_03 = async (s, ctx, state) => {
        
        if(s.userId != this.pointsAdminId ){
            return false;
        }

		const userId = ctx.from.id;
        var grade = ctx.message.text;
		
		state.uid = ctx.from.id;
		
		const screen = s.uiInside("SURVEY");
		

		await MPointsCategory.updateOne({
            refCode: state.refCode,
            pointsCode: grade
        },  {
            refCode:state.refCode,
            author: userId,
            timePosted: new Date(),
            pointsCode: grade,
            isHidden: false
        }, {upsert: true });

        return true;
		//return this.step_show_field(s, ctx, state);
		
	}

    /**
 * reload audience
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
	step01_04 = async (s, ctx, state) => {
        
        if(s.userId != this.pointsAdminId ){
            return false;
        }

		const userId = ctx.from.id;

		var msgDef =
`# GRADES
## RELOAD
Users were reloaded
===
`;


        var aud = await MPointsQuery.updateAudience("studInfo", state.refCode);

		const screen = s.uiInside("GRADES");
		const prev = screen.getMessage("LIST");
		prev.hideAllButtons();
		await screen.updateMessage(ctx, "LIST");

		const msg = s.uiReg3(msgDef, true);
		await screen.postMessage(ctx, "NEW", userId);
		s.watchMessage();

        //state.expected = "answer";
		return true;
	}


    // 02_01 - post a grade
    // choose a grade
    // get one random person with no grades
    // put a grade
    // start over again
    /**
 * add grades
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
 step02_01 = async(s, ctx, state) => {
        var refCode = this.refCode;
        state.refCode = refCode;
		const userId = ctx.from.id;

        if(userId != this.pointsAdminId ){
            return false;
        }

		var msgDef =
`# GRADING
## LIST
Choose from the list of grades:
{{ ? | | }}
===
{{ ? | 4 | btn_grades }}`;


        var list = await MPointsQuery.getAllGradingCategories(this.refCode);
        


		const screen = s.uiInside("GRADING");
		const msg = s.uiReg3(msgDef, false);
        var btns = list.map((x,i)=>{
            return {
                code: this.currentAlias + "_0202_" + x,
                text: "" + (i + 1)
            };
        });

        list.forEach((x, i) => {
           msg.addItem(x, (i + 1) + ". " + x); 
        });

        
        msg.setBtnPlace("btn_grades", btns);
        msg.createButtonsTable();

        await screen.postMessage(ctx, "LIST", userId);
		s.watchCallback();

        state.expected = "";


		return true;
	}

/**
 * add grades
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step02_02 = async (s, ctx, state) => {
    var prefix = this.currentAlias + "_0202_";
    var grade = ctx.callbackQuery.data;
    grade = grade.substr(prefix.length);

    if(s.userId != this.pointsAdminId ){
        return false;
    }
    
    state.pointsCode = grade;

    await ctx.reply("Ok. You have chosen " + grade);

   return await this.step02_02_show(s, ctx, state);

}

/**
 * show 
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step02_02_show = async (s, ctx, state) => {


    // select several students
    var aud = await MPointsQuery.findUngraded(state.refCode, state.pointsCode);

    if(aud == null || aud.length == 0){
        return false;
    }

    // show 
    var users = aud.map((x, i)=>{
        return {
            uid:x.uid ,
            email:x.email,
            fname:x.fname,
            lname:x.lname,
            position: (i+1)
        }
    });

    state.users = users;

    var msgDef =
`# GRADING
## TARGETUSERS
Choose a person from the list:
{{ ? | | }}
===
{{ ? | 4 | btn_users }}`;

        var list = users;

		const screen = s.uiInside("GRADING");
		const msg = s.uiReg3(msgDef, false);
        var btns = list.map((x,i)=>{
            return {
                code: this.currentAlias + "_0203_" + x.uid,
                text: "" + (i + 1)
            };
        });

        list.forEach((x, i) => {
           msg.addItem(x.uid, (i + 1) + ". " + x.email + " " + x.lname + " " + x.fname); 
        });

        
        msg.setBtnPlace("btn_users", btns);
        msg.createButtonsTable();

        await screen.postMessage(ctx, "TARGETUSERS", s.userId);

        return true;
}

//
/**
 * choose a person
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step02_03 = async (s, ctx, state) => {
    var prefix = this.currentAlias + "_0203_";
    var person = ctx.callbackQuery.data;
    person = person.substr(prefix.length);
    
    if(s.userId != this.pointsAdminId ){
        return false;
    }

    state.uid = person;

    var persObj = state.users.find(x=>x.uid == person);

    await ctx.reply("Ok. You have chosen " + persObj.fname);


    var msgDef =
`# GRADING
## GRADE
Now choose a grade
===
{{ ? | 3 | btn_grade }}`;

        var list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

		const screen = s.uiInside("GRADING");
		const msg = s.uiReg3(msgDef, false);
        var btns = list.map((x,i)=>{
            return {
                code: this.currentAlias + "_0204_" + x,
                text: x
            };
        });
        
        msg.setBtnPlace("btn_grade", btns);
        msg.createButtonsTable();

        await screen.postMessage(ctx, "GRADE", s.userId);

        return true;
}

//
/**
 * save a grade
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step02_04 = async (s, ctx, state) => {
    var prefix = this.currentAlias + "_0204_";
    var grade = ctx.callbackQuery.data;
    grade = grade.substr(prefix.length);
    
    state.pointsAmt = grade;
    state.author = s.userId;

    await this.postPoints(state);

    var persObj = state.users.find(x=>x.uid == state.uid);

    var msgDef =
`# GRADING
## RESULT
{{ PERSON | person's name | }} - {{ GRADE | grade | }}
===
`;

       
		const screen = s.uiInside("GRADING");
        const p = screen.getMessage("GRADE");
        p.hideAllButtons();
        await screen.updateMessage(ctx, "GRADE");

		const msg = s.uiReg3(msgDef, false);
        msg.setPlaceholder("PERSON", persObj.email + " " + persObj.fname + " " + persObj.lname);
        msg.setPlaceholder("GRADE", "" + state.pointsAmt);

        await screen.postMessage(ctx, "RESULT", s.userId);

        return await this.step02_02_show(s, ctx, state);
}

//
/**
 * bulk write ID:...%%G:...%%C:... \n
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step05_01 = async (s, ctx, state) => {

    if(s.userId != this.pointsAdminId ){
        return false;
    }

    state.refCode = this.refCode;

    var prefix = this.postBulkPointsCommand;
    var grade = ctx.message.text;
    grade = grade.substr(prefix.length+1);

    var lines = grade.trim().split("\n").map(x=>x.split("%%"));
    if(lines == null || lines[0]==''){
        return false;
    }
    // uid  points
    
    var points = lines.map(x=>{
        var d = x.reduce((p,c)=>{
            const i1 = c.indexOf(":");
            if(i1>0){
                switch(c.substr(0, i1)){
                    case "C":
                        p.comment = c.substr(i1+1);
                    break;
                    case "ID":
                        p.uid = c.substr(i1+1);
                    break;
                    case "G":
                        p.points = c.substr(i1+1);
                    break;
                }
            }
            return p;
        }, {});

        return {
            uid:d.uid,
            points:d.points,
            author: s.userId,
            saved:false,
            comment: d.comment
        };
    });

    var users = points.map(x=>x.uid);
    var aud = await MPointsQuery.findAud(state.refCode, users);
    var dictAud = aud.reduce(( p, x)=>{
        p[x.uid] = x;
        return p;
    }, {});

    points.forEach(x=>{
        var a = dictAud[x.uid];
        if(a != null){
            x.name = a.fname + " " + a.lname;
            x.email = a.email;
        }
    });

    state.points = points;

    var msgDef =
`# GRADING
## LIST
Choose from the list of grades:
{{ ? | | }}
===
{{ ? | 4 | btn_grades }}`;

        var list = await MPointsQuery.getAllGradingCategories(this.refCode);
		const screen = s.uiInside("GRADING");
		const msg = s.uiReg3(msgDef, false);
        var btns = list.map((x,i)=>{
            return {
                code: this.currentAlias + "_0502_" + x,
                text: "" + (i + 1)
            };
        });
        list.forEach((x, i) => {
           msg.addItem(x, (i + 1) + ". " + x); 
        });
        msg.setBtnPlace("btn_grades", btns);
        msg.createButtonsTable();
        await screen.postMessage(ctx, "LIST", s.userId);
		s.watchCallback();

        state.expected = "";

        


    return true;	
}

/**
 * save
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step05_02 = async (s, ctx, state) => {
    var prefix = this.currentAlias + "_0502_";
    var grade = ctx.callbackQuery.data;
    grade = grade.substr(prefix.length);
    state.refCode=this.refCode;

    if(s.userId != this.pointsAdminId ){
        return false;
    }
    
    state.pointsCode = grade;

    await ctx.reply("Ok. You have chosen " + grade);

    if(state.points==null){
        return false;
    }


    var users = state.points.map(x=>x.uid);
    var grades = await MPointsQuery.getUsersPoints(state.refCode, grade, null, users);
    var dictGrades = grades.reduce(( p, x)=>{
        p[x.uid] = {
            pointsAmt: x.pointsAmt, 
            pointsCode: x.pointsCode,
            comment: x.comment
        };
        return p;
    }, {});

    var msgDef =
`# GRADING
## CONFIRMATION
I will save the following grades:
{{ ? | | }}

{{ RESULT | result of operation | }}
===
{{ ${this.currentAlias + "_0503ok"} | Confirm | btn_ok }}
{{ ${this.currentAlias + "_0503cancel"} | Cancel | btn_cancel }}`;
    
    const screen = s.uiInside("GRADING");
    const msg = s.uiReg3(msgDef, true);

    state.points.forEach(x=>{
        x.pointsCode = grade;
    });


    state.points.forEach(x => {
        const p = dictGrades[x.uid];
        if(p==null){
            msg.addItem(x.uid, x.name +" NEW "+x.points + "  (" + x.pointsCode + ")" + (x.comment != null?" +comment":""));
        }else{
            const newComment = x.comment != p.comment;
            msg.addItem(x.uid, x.name +" " + p.pointsAmt + "->"+x.points + "  (" + x.pointsCode + ")" + (x.comment != null?" "+(newComment==true?"+":"") +"comment":""));
        }
    });

    await screen.postMessage(ctx, "CONFIRMATION", s.userId);

   /* for (const pts of state.points) {
        state.uid = pts.uid;
        state.author = s.userId;
        state.pointsAmt = pts.points;
        state.pointsCode = pts.pointsCode;
        await this.postPoints(state);
    }
    */

   //return await this.step02_02_show(s, ctx, state);

}


/**
 * save
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step05_03_ok = async (s, ctx, state) => {

    if(s.userId != this.pointsAdminId ){
        return false;
    }

    if(state.points==null){
        return false;
    }
    
    
    const screen = s.uiInside("GRADING");
    const msg = screen.getMessage("CONFIRMATION");
    msg.hideAllButtons();
    msg.setPlaceholder("RESULT", "DONE");
    await screen.updateMessage(ctx, "CONFIRMATION");

   for (const pts of state.points) {
        state.uid = pts.uid;
        state.author = s.userId;
        state.pointsAmt = pts.points;
        state.pointsCode = pts.pointsCode;
        state.comment = pts.comment;
        await this.postPoints(state);
    }
    
    return true;
}


/**
 * cancel
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step05_03_cancel = async (s, ctx, state) => {

    if(s.userId != this.pointsAdminId ){
        return false;
    }

    if(state.points==null){
        return false;
    }
    
    
    const screen = s.uiInside("GRADING");
    const msg = screen.getMessage("CONFIRMATION");
    msg.hideAllButtons();
    msg.setPlaceholder("RESULT", "CANCELLED");
    await screen.updateMessage(ctx, "CONFIRMATION");

   
    return false;
}

/**
 * save
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step06_01 = async (s, ctx, state) => {
    if(s.userId != this.pointsAdminId ){
        return false;
    }
    state.refCode = this.refCode;
    var msgDef =
`# SENDING
## LIST
Choose from the list of grades:
{{ ? | | }}
===
{{ ? | 4 | btn_grades }}`;
    
            var list = await MPointsQuery.getAllGradingCategories(this.refCode);
            const screen = s.uiInside("SENDING");
            const msg = s.uiReg3(msgDef, false);
            var btns = list.map((x,i)=>{
                return {
                    code: this.currentAlias + "_0602_" + x,
                    text: "" + (i + 1)
                };
            });
            list.forEach((x, i) => {
               msg.addItem(x, (i + 1) + ". " + x); 
            });
            msg.setBtnPlace("btn_grades", btns);
            msg.createButtonsTable();
            await screen.postMessage(ctx, "LIST", s.userId);
            s.watchCallback();
    
            state.expected = "";
    return true;
}

/**
 * save
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step06_02 = async (s, ctx, state) => {
    var prefix = this.currentAlias + "_0602_";
    var grade = ctx.callbackQuery.data;
    grade = grade.substr(prefix.length);

    var botInfo = this.getAppCore().botInfo;

    if(s.userId != this.pointsAdminId ){
        return false;
    }
    
    state.pointsCode = grade;

    await ctx.reply("Ok. You have chosen " + grade);

    // how many?

    // other types of messages? notifications, tasks, etc.

    state.points = await MPointsQuery.getUsersPoints(this.refCode, state.pointsCode, false);

    if(state.points==null || state.points.length == 0){
        await ctx.reply("New marks were not found");
        return false;
    }

    
    let counter = 0;
    for (const x of state.points) {
        
        var msgDef = 
`# RESULTS
## GRADE_HTML
Dear {{ Name | Name of User | }}, your grade for {{ Mark | Name of mark | }} is {{ Points | Student mark | }}
{{Comments | Comments | }}

<a href='http://t.me/${botInfo.userName}?start=C-${this.currentAlias}-${this.feedbackCommand}-${this.refCode}-${grade}'>press to rate this assignment</a>`;

        if(x.timePosted != null && x.timePosted >= x.timeChanged){
            continue;
        }

        const msg = UIMessage.messageFromString(msgDef, false, x.uid);
        msg.setPlaceholder("Name", x.user.fname + " " + x.user.lname);
        msg.setPlaceholder("Mark", x.pointsCode);
        msg.setPlaceholder("Points", x.pointsAmt);
        if(x.comment != null && x.comment != ''){
            msg.setPlaceholder("Comments", x.comment);
        }

        await UIScreen.postMessageObj(ctx, msg);

        // now save the time posted so next time we will not send the same mark twice
        await MPoints.updateOne({ _id: x._id },
             {
                $set:{
                    timePosted: new Date(),
                    isPosted: true
                }
             }).exec();

        counter++;

        if(counter > 0 && counter % 27 === 0){ // no more than 30 messages per second
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    await ctx.reply("Notifications were sent to " + counter + " users");

    return true;
}

/**
 * show feedback dialog
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step07_01 = async (s, ctx, state) => {
    const msgDef = 
    `# FEEDBACK
## APPEAL
Please, write a brief message (<1000 characters) and/or press a button below:
1 - did not like the assignment or grade
2 - the assignment was ok
3 - the assignment was interesting and informative
Subject: {{ Grade | grade name | }}
Mark: {{ PointsAmt | current points amount | }}
{{ ResultStatus | statis | }}
{{ ResultRate | rating | }}
{{ ResultText | text of the message with feedback | }}
===
{{ ${this.currentAlias + "_0702_1"} | ⭐ | dislike }}{{ ${this.currentAlias + "_0702_2"}  | ⭐ ⭐ | ok }}{{ ${this.currentAlias + "_0702_3"}  | 🌟 🌟 🌟 | good }}
{{ ${this.currentAlias + "_0702cancel"}  | ⏏️ | cancel }}`;

    var params = ctx.params;
    if(params == null || params.data == null){
        return false;
    }

    // there might be a start command mesage. We need to drop it.
    if(ctx.message!=null &&  ctx.message.text.indexOf("start")>=0){
        await ctx.deleteMessage(ctx.message.message_id);
    }

    const pointsCode = params.data[1];
    let grade = await MPoints.findOne({
        refCode: this.refCode, 
        uid: s.userId,
        pointsCode: pointsCode
    }).exec();

    if(grade == null){
        ctx.reply("Grade was not found");
        return false;
    }else{
        grade = grade.toObject();
    }

    state.feedback.id = grade._id;
    state.feedback.rating = 0;
    state.feedback.text = "";
    state.feedback.inProgress = true;

    const screen = s.uiInside("FEEDBACK");
    const msg = s.uiReg3(msgDef, true);
    msg.setPlaceholder("Grade", pointsCode);
    msg.setPlaceholder("PointsAmt", grade.pointsAmt);

    await screen.postMessage(ctx, "APPEAL", s.userId);

    s.watchMessage();
    s.watchCallback();
    state.expected = "feedbackMsg";

    return true;
}


/**
 * save points
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step07_02_points = async (s, ctx, state) => {
    const prefix = this.currentAlias + "_0702_";
    const v = ctx.callbackQuery.data.substring(prefix.length);
    state.feedback.rating = v;

    const screen = s.uiInside("FEEDBACK");
    const msg = screen.getMessage("APPEAL");

    msg.setPlaceholder("ResultRate", "Your choice: " + v);

    await screen.updateMessage(ctx, "APPEAL");


    // send a confirmation with button
    const msg0 = screen.getMessage("RATE");
    if(msg0!=null){
        msg0.hideAllButtons();
        await screen.updateMessage(ctx, "RATE");
    }

    const msgDef = 
`# FEEDBACK
## RATE
You can send a message or press finish to save the feedback
===
{{ ${this.currentAlias + "_0703" } | Finish | finish}}{{ ${this.currentAlias + "_0702cancel"}  | ⏏️ | cancel }}`;
    const msg2 = s.uiReg3(msgDef, true);
    await screen.postMessage(ctx, "RATE", s.userId);

    return true;
}

/**
 * save message
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step07_02_message = async (s, ctx, state) => {
    const text = ctx.message.text.substring(0, 1000);
    state.feedback.text = text;

    const screen = s.uiInside("FEEDBACK");
    const msg = screen.getMessage("APPEAL");

    msg.setPlaceholder("ResultText", "Message:\n" + text);

    await screen.updateMessage(ctx, "APPEAL");

    // send a confirmation with button
    const msg0 = screen.getMessage("RATE");
    if(msg0!=null){
        msg0.hideAllButtons();
        await screen.updateMessage(ctx, "RATE");
    }

    const msgDef = 
`# FEEDBACK
## RATE
You can send a message or press finish to save the feedback
===
{{ ${this.currentAlias + "_0703" } | Finish | finish}}{{ ${ this.currentAlias + "_0702cancel" }  | ⏏️ | cancel }}`;
    const msg2 = s.uiReg3(msgDef, true);
    await screen.postMessage(ctx, "RATE", s.userId);

    return true;
}


/**
 * cancel
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step07_02_cancel = async (s, ctx, state) => {
    const screen = s.uiInside("FEEDBACK");
    const msg = screen.getMessage("APPEAL");
    msg.setPlaceholder("ResultStatus", "State: Cancelled");
    await screen.postMessage(ctx, "APPEAL", s.userId);

    await ctx.reply("You have cancelled the survey");

    return false;
}


/**
 * finish
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step07_03 = async (s, ctx, state) => {
    
    if(state.feedback == null || state.feedback.id == null || state.feedback.inProgress!= true){
        return false;
    }

    state.feedback.inProgress=false;

    await MPoints.updateOne({
        _id: state.feedback.id
    }, {
        $push:{
            feedback:{
                timeChanged: new Date(), 
                text: state.feedback.text,
                rating: state.feedback.rating
            }
        }
    }).exec();

    const screen = s.uiInside("FEEDBACK");
    const msg = screen.getMessage("APPEAL");
    msg.setPlaceholder("ResultStatus", "Status: Sent");

    // clear buttons
    const msg0 = screen.getMessage("RATE");
    if(msg0!=null){
        msg0.hideAllButtons();
        await screen.updateMessage(ctx, "RATE");
    }
    const msg1 = screen.getMessage("APPEAL");
    if(msg1!=null){
        msg1.hideAllButtons();
        await screen.updateMessage(ctx, "APPEAL");
    }

    await ctx.reply("Thank you for the feedback");

    return false;
}

/**
 * post or update one grade
 * @param {asoPointsSender} state 
 */
postPoints = async (state) => {
	
    state.currentGrade.createdTime = new Date();
	state.currentGrade.uid = state.uid;
	state.currentGrade.refCode = state.refCode;
	state.currentGrade._id = new ObjectId();
	
    // create an empty record if there is no grade record
	var r = await MPoints.findOneAndUpdate({
        uid : state.uid,
        refCode : state.refCode,
        pointsCode : state.pointsCode
      }, 
       {
        $setOnInsert: { uid: state.uid, 
                refCode: state.refCode, 
                pointsCode: state.pointsCode,
                timeAttempt: new Date()
            }
       },
       {upsert: true});

    // do not set isPosted = false if mark did not change
    if(r != null && ( r.pointsAmt == state.pointsAmt && r.comment == state.comment ) ){
        // nothing to do here
    }else {
        await MPoints.updateOne({
            uid : state.uid,
            refCode : state.refCode,
            pointsCode : state.pointsCode
        }, {
            $set: { 
                isPosted: false,  // mark the record as unpublished
                author: state.author,
                pointsAmt: state.pointsAmt,
                hasNewChanges: true,
                timeChanged: new Date(),
                timeAttempt: new Date(),
                comment: state.comment
            },
            $push: {
                history: { 
                    timeChanged:new Date(), 
                    pointsAmt:state.pointsAmt,
                    author: state.author
                }
            }
        });
    }
	
	state.id = state.currentGrade._id;
}

/**
 * Find my grades
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step03_01 = async (s, ctx, state) => {
    // need to show the grades:

    var refCode = this.refCode;
	const userId = ctx.from.id;

    var groupId = this.filterGroupId;
    if(groupId != ""){
        try{
            var c = await ctx.telegram.getChatMember(Number(groupId), s.userId);
            if(c.status == 'creator' || c.status == 'member' || c.status == "administrator"){
                // ok
            }else{
                await ctx.reply("Sorry, the bot is not available now");
                return false;
            }
        } catch (exe){
            await ctx.reply("Sorry, the bot is not available now");
            return false;
        }
    }else{
        await ctx.reply("Sorry, the bot is not available now");
        return false;
    }

		var msgDef =
`# MYGRADES
## LIST
Your grades:
{{ ? | | }}
===
`;


        var list = await MPointsQuery.getPoints(refCode, userId);
        
        // adding calculated ones
        if(this.calculatedPoints!=null && this.calculatedPoints.length>0){
            var list2 = list.reduce((p,x)=>{
                p[x.pointsCode] = x.pointsAmt;
                return p;
            }, {});

            this.calculatedPoints.forEach(cp => {
                list.push({
                    author:"robot",
                    pointsCode: cp.pointsCode,
                    pointsAmt: cp.calc(list2),
                    refCode: this.refCode
                });
            });
            
        }

		const screen = s.uiInside("MYGRADES");
		const msg = s.uiReg3(msgDef, false);

        list.forEach((x, i) => {
           msg.addItem(x.pointsCode, x.pointsCode + ": " + x.pointsAmt); 
        });

        await screen.postMessage(ctx, "LIST", userId);
		s.watchCallback();

        state.expected = "";


		return false;

}

/**
 * get list of users
 * @param {SessionObject} s 
 * @param {Context} ctx 
 * @param {asoPointsSender} state 
 */
step04_01 = async (s, ctx, state)=>{

    if(s.userId != this.pointsAdminId ){
        return false;
    }

    const prefix = this.listCommand;
    const gr = ctx.message.text.substring(prefix.length);
    const userId = ctx.from.id;

    var res = await MPointsAudience.find({
        refCode: this.refCode
    },{
        uid:1,
        lname:1,
        fname:1,
        email:1,
        _id:-1
    }).sort([
        ["lname", "asc"], 
        ["fname", "asc"]
    ]
        ).exec();

    res = res
        .map(x=>x.toObject());

    res.forEach((x, i)=>{
        x.group = Math.floor( i / 25 );
    });

    res = res
        .reduce((p, x)=>{
            if(x.group >= p.length){
                p.push([]);
            }
            p[x.group].push(x);
            return p;
        }, []);

    for (const g of res) {
        var txt = g
            .map(x=>x.uid+"|"+x.lname+" "+x.fname+"|"+x.email)
            .join("\n");

        await ctx.reply(txt);
    }

    return false;

}




}

module.exports = {
	AppPointsSender
};