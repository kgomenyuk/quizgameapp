
// addGrade
const { AppBase } = require("../lib/AppBase");
const Uuid = require("uuid");
const { SessionObject, SessionManager } = require("../lib/Sessions");
const { Context } = require("telegraf");

const { TGCommandEventTrigger, TGCallbackEventTrigger, TGMessageEventTrigger } = require("../lib/Triggers");
const { UIMessage } = require("../lib/UIScreen");
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

		this.app = "sfields";
		this.isPublicAllowed = false;
	}

	// settings:
	refCode = ""; // reference code
    profileCode = ""; //
	
    startCommand = "grades"; // command that triggers the survey
	//adminStartCommand = "srvadmin";


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
		this.refCode = settings.refCode;

    }

	_getTriggers () {

		var trgs = [];
		var alias = this.currentAlias;

		// start the grading session
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
	step01_01 = async (s, ctx, state)=> {

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
 * bulk write
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

    var lines = grade.trim().split("\n").map(x=>x.split("  "));
    // uid  points
    
    var points = lines.map(x=>{
        return {
            uid:x[0],
            points:x[1],
            author: s.userId,
            saved:false
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
        msg.addItem(x.uid, x.name +"   "+x.points + "  (" + x.pointsCode + ")");
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

    if(s.userId != this.pointsAdminId ){
        return false;
    }
    
    state.pointsCode = grade;

    await ctx.reply("Ok. You have chosen " + grade);

    state.points = await MPointsQuery.getUsersPoints(this.refCode, state.pointsCode);

    if(state.points==null){
        return false;
    }

    for (const x of state.points) {
    var Massage = 
`# RESULTS
## GRADE
Dear {{ Name | Name of User | }}, you grade for {{ Mark | Name of mark | }} is {{ Point | Student mark | }}.`;
    const session = await (this.getAppCore().sMan).fetch2(x.uid);
    const screen = session.uiInside("RESULTS");
    const msg = session.uiReg3(Massage, false);
    await screen.postMessage(ctx, "GRADE", x.uid);
    }

    return true;
}
/**
 * Set survey code
 * @param {asoPointsSender} state 
 */
postPoints = async (state) => {
	
    state.currentGrade.createdTime = new Date();
	state.currentGrade.uid = state.uid;
	state.currentGrade.refCode = state.refCode;
	state.currentGrade._id = new ObjectId();
	
    // create an empty record
	var r = await MPoints.updateOne({
        uid : state.uid,
        refCode : state.refCode,
        pointsCode : state.pointsCode
      }, 
       {
        $setOnInsert: { uid: state.uid, 
                refCode: state.refCode, 
                pointsCode: state.pointsCode, 
                isPosted: false
            }
       },
       {upsert: true});

    await MPoints.updateOne({
        uid : state.uid,
        refCode : state.refCode,
        pointsCode : state.pointsCode
      }, {
        $set: { 
            isPosted: false, 
            author: state.author,
            pointsAmt: state.pointsAmt,
            hasNewChanges: true,
            timeChanged: new Date()
        },
        $push: {
            history: { 
                timeChanged:new Date(), 
                pointsAmt:state.pointsAmt,
                author: state.author
            }
        }
       });
	
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