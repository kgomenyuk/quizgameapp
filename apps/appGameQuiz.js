const { AppBase } = require("../lib/AppBase");  
const Uuid = require("uuid");
const { asoGameQuiz, dictGameQuiz } = require("./asoGameQuiz");
const { SessionObject, SessionManager } = require("../lib/Sessions");
const { Context } = require("telegraf");
const { QuizGame } = require("../quiz_game");
const { GameManager } = require("../game_manager");
const { QuizGameManager } = require("../quizgame_manager");
const { getDb, getGameInstanceHeader } = require("../data/db");
const { MGameInstance } = require("../data/model");
const { TGCommandEventTrigger, TGCallbackEventTrigger, TGMessageEventTrigger } = require("../lib/Triggers");
const { QuizGameBuilder } = require("../game_builder");
const { UIMessage } = require("../lib/UIScreen");
const { leftJoin, tidy } = require("@tidyjs/tidy");



class AppGameQuiz extends AppBase { 
	_init(){
        this.taskId = "";
        this.taskCode = "";

		this.app = "game2";
		this.isPublicAllowed = false;     
	}

	getState(){

	}

	/**
	 * 
	 * @param {SessionManager} sman 
	 */
	_requireSharedData=(sman)=>{
		sman.addShared(this.currentAlias, (store)=>{
			store["allGames"] = [];
			store["dictGames"] = {};
			store["dictGameByPlayerCode"] = {};
			store["dictGameByAudienceCode"] = {};
		});
	}
	
	_getTriggers(){

		// pass parameters
		var trCmdPassGamePlanCode = new TGCommandEventTrigger("trCmdPassGamePlanCode", "start", (s, e)=>{return true;});


		// start the game
		var trCmdGame2 = new TGCommandEventTrigger("trCmdGame2", "game2", null);
		trCmdGame2.handlerFunction = this.step01_01_enterID;

		var trMsgstep01_02_enterID = new TGMessageEventTrigger("trMsgstep01_02_enterID");
		trMsgstep01_02_enterID.handlerFunction = this.step01_02_enterID;

		var trCmdSetPlanId = new TGCommandEventTrigger("trCmdSetPlanId", "gm2plid");
		trCmdSetPlanId.handlerFunction = this.step01_02_enterID;

		var trCbGameOk = new TGCallbackEventTrigger("trCbGameOk", null, "g2\!0201\!ok");
		trCbGameOk.handlerFunction = this.step02_02_selectGameOk;

		var trCbGameCancel = new TGCallbackEventTrigger("trCbGameCancel", null, "g2\!0201\!cancel");
		trCbGameCancel.handlerFunction =this.step02_03_selectGameCancel;

		var trCbGameAccess = new TGCallbackEventTrigger("trCbGameAccess", null, "g2\!0202a\!");
		trCbGameAccess.handlerFunction = this.change_access;


		var trCbSelectShowQuestions = new TGCallbackEventTrigger("trCbSelectShowQuestions", null, "g2\!0202\!(yes|no)");
		trCbSelectShowQuestions.handlerFunction = this.step02_04_settingsQScoreCount;

		var trCbSelectScoreMode = new TGCallbackEventTrigger("trCbSelectScoreMode", null, "g2\!0204\!(round|question)");
		trCbSelectScoreMode.handlerFunction = this.step02_05_settingsQAudience;

		var trCbSelectAudienceMode = new TGCallbackEventTrigger("trCbSelectAudienceMode", null, "g2\!0205\!(yes|no)");
		trCbSelectAudienceMode.handlerFunction = this.step02_06_StartGame;

		var trCbAdmSelectGameStart = new TGCallbackEventTrigger("trCbAdmSelectGameStart", null, "g2\!0206\!start");
		trCbAdmSelectGameStart.handlerFunction = this.step05_06_StartingTheGame;

		var trCbAdmSelectGameCancel = new TGCallbackEventTrigger("trCbAdmSelectGameCancel", null, "g2\!0206\!cancel");
		trCbAdmSelectGameCancel.handlerFunction = this.step02_07_CancelGame;


		// control request
		var trCmdControl2 = new TGCommandEventTrigger("trCmdControl2", "control2", null);
		trCmdControl2.handlerFunction = this.step03_01_QMRequest;

		var trCbControl2Confirm = new TGCallbackEventTrigger("trCbControl2Confirm", null, "g2\!0301\!yes");
		trCbControl2Confirm.handlerFunction = this.step03_04_QMRequestConfirm;

		var trCbControl2Reject = new TGCallbackEventTrigger("trCbControl2Reject", null, "g2\!0301\!no");
		trCbControl2Reject.handlerFunction = this.step03_05_QMRequestReject;

		
		// players join the game
		var trCmdPlay2 = new TGCommandEventTrigger("trCmdPlay2", "play2", null);
		trCmdPlay2.handlerFunction = this.step04_01_joinTheGame;

		var trCbPlayJoinTeam2 = new TGCallbackEventTrigger("trCbPlayJoinTeam2", null, "^g2\!0402\!");
		trCbPlayJoinTeam2.handlerFunction = this.step04_04_joinTeam;

		var trCbPlayJoinTeamCancel2 = new TGCallbackEventTrigger("trCbPlayJoinTeamCancel2", null, "^g2\!0402cancel");
		trCbPlayJoinTeamCancel2.handlerFunction = this.step04_04_joinTeamCancel;


		// game process
		var trCbGameBegin1stRound = new TGCallbackEventTrigger("trCbGameBegin1stRound", null, "^g2\!0506\!round\!");
		trCbGameBegin1stRound.handlerFunction = this.step05_08_StartQuestion;

		var trCbGameSkipRound = new TGCallbackEventTrigger("trCbGameSkipRound", null, "^g2\!0506\!skip\!");
		trCbGameSkipRound.handlerFunction = this.step05_07_SkipRound;

		var trCbGameBeginRound = new TGCallbackEventTrigger("trCbGameBeginRound", null, "^g2\!0508\!start\!");
		trCbGameBeginRound.handlerFunction = this.step05_09_ShowQuestion;
		

		return [
			trCmdGame2, trMsgstep01_02_enterID, trCmdSetPlanId,
			trCbGameOk, trCbGameCancel, trCbGameAccess,
			trCbSelectShowQuestions,
			trCbSelectScoreMode, trCbSelectAudienceMode, trCbAdmSelectGameStart, trCbAdmSelectGameCancel,

			trCmdControl2, trCbControl2Confirm, trCbControl2Reject,

			trCmdPlay2, trCbPlayJoinTeam2, trCbPlayJoinTeamCancel2,

			trCbGameBegin1stRound, trCbGameSkipRound, trCbGameBeginRound
			];
	}
	
	// initial session object
	_newSessionDataObject(){
		return new asoGameQuiz();
	}
	
	_checkBeforeRun(s, t){
		return true;
	}
	
	
	// загрузить данные из БД
	async _loadData(){
		
 		
 		
 		return true;
	}

	// ALL HANDLERS 

	/**
	 * Handle game2 command
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step01_01_enterID(s, ctx, state) {
		// take parameters from the input
		var args = ctx.message.text.split(" ");
		// 1 = nr of teams
        const teams = Number(args[1]);
        // 2 = team members limit
        const limit = Number( args[2]);

		/*
		validation
		*/
		if(args.length < 3){
			// incorrect command
			await ctx.reply("Please, use the following parameters: /game2 numberOfTeams teamMembersLimit\nE.g., /game2 2 3");
				return false;
		}

        const g = new QuizGame();

        const code = g.getCode();
		const userId = ctx.message.from.id;

        g.initialize(teams, limit, userId);
		g.setQuizOwner(userId);

		var comRef = this.getSharedData();
		comRef.allGames.push(g);
        comRef.dictGames[code] = g;
		comRef.dictGameByPlayerCode[g.getCodeForPlayers()] = g;
		comRef.dictGameByAudienceCode[g.getCodeForAudience()] = g;

        // attach game to the current user
        state.game = g;
		state.roles.push("owner");

		

		const link = this.getSettingsItem("webhost");
		var linkAddress  = "";
		if(link != null){
			// the parameter was set
			linkAddress = link.value + "plans/list";
			linkAddress = "\nYou can find the list of available quizzes here " + linkAddress;
		}

        // send code to the chat
		const msgDef = 
`# START
## START_TITLE
The game is still being created. You can use the following codes to invite people in the game:
Quiz master - {{ CODE_QUIZMASTER }}
Players - {{ CODE_PLAYERS }}. {{ LINK_PLAYERS }}
Audience - {{ CODE_AUDIENCE }}

{{ LINK_GAME_VIEW }}

Please, type the short code of a quiz you would like to use this time

{{ PLANS_LINK }}`;

		

		const msg = s.uiReg3(msgDef, true);
		const screen = s.uiGetCurrentScreen();
		msg.setPlaceholder("CODE_QUIZMASTER", code);
		msg.setPlaceholder("CODE_PLAYERS", g.getCodeForPlayers());
		msg.setPlaceholder("CODE_AUDIENCE", g.getCodeForAudience());
		msg.setPlaceholder("PLANS_LINK", linkAddress);		
		

		await screen.postMessage(ctx, "START_TITLE", userId);

		s.watchMessage(); // waiting for a message
	};
	
	/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step01_02_enterID(s, ctx, state) {
		var msgDef = 
`# START
## PLAN_INPUT
Ok, you have chosen {{ GAMEPLAN }}
{{ CHECKRESULT }}`;
		const msg = s.uiReg3(msgDef);
		const scr = s.uiGetCurrentScreen();

		var txtGamePlanID = ctx.message.text;
		if(ctx.params!=null && ctx.params.data!=null){//txtGamePlanID.startsWith("/start C-gm2-gm2plid-")){
			txtGamePlanID = ctx.params.data;//txtGamePlanID.substring(7,100);
		}

		const gamePlanExists = 
			await this.dbContext.checkPlanExists(txtGamePlanID);
		msg.setPlaceholder("GAMEPLAN", txtGamePlanID);

		if(gamePlanExists == true){
			await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
			
			msg.setPlaceholder("CHECKRESULT", "Good. We have found it in our database.");
			await scr.postMessage(ctx, "PLAN_INPUT", ctx.message.from.id);

			state.planId = txtGamePlanID;
			state.planExists = true;
			
			return await this.step02_01_selectGame(s, ctx, state);
		}else{
			state.planExists = false;
			msg.setPlaceholder("CHECKRESULT", "Unfortunately, we could not find it. Please, try again.");
			await scr.postMessage(ctx, "PLAN_INPUT", ctx.message.from.id);
			return false;
		}
	};
	
	/**
	 * Game was found
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_01_selectGame(s, ctx, state) {
		const userId = ctx.from.id;
		const msgDef = `#START
##PLAN_SUMMARY
{{ PLANTITLE }}

Number of questions: {{ QUESTIONSCOUNT }}.
First five questions:
{{ NOT_FOUND | Not found message | }}
{{? | Questions | }}

{{ MESSAGE_TEXT | Result of search | }}
===
{{ g2!0201!ok | Confirm | ok }} {{ g2!0201!cancel | Cancel | cancel }}`;

		const scr = s.uiInside("START");
		const msg = s.uiReg3(msgDef, true);
		//const scr = s.uiGetCurrentScreen();


		const summary = await this.dbContext.getGamePlanSummary(state.planId);
		if(summary != null){			
			msg.setPlaceholder("PLANTITLE", summary.plan.title);
			msg.setPlaceholder("QUESTIONSCOUNT", summary.plan.questionCount);
			const qSummary = summary
				.questions
				.map((x,i)=>
				{ 
					return {id: i, value: `${i}. ${x.quizId}. ${ x.questionText.substring(0, 25)}....`};
				});
			msg.array = qSummary;
			msg.setPlaceholder("MESSAGE_TEXT", "Please, confirm the quiz plan.");

			await scr.postMessage(ctx, "PLAN_SUMMARY", userId);
		}else{
			msg.setPlaceholder("PLANTITLE", '---');
			msg.setPlaceholder("QUESTIONSCOUNT", '---');
			msg.setPlaceholder("NOT_FOUND", 'Not found');
			msg.setPlaceholder("MESSAGE_TEXT", "We could not find the quiz plan");
			await scr.postMessage(ctx, "PLAN_SUMMARY", userId);
		}

		s.watchCallback();
		s.unwatchMessage();

		return true;
	};

	/**
	 * Game does not exist
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_01_noGamePlan(s, ctx, state) {
		
		await ctx.sendMessage("Sorry, game with ID was not found");

		s.unwatchCallback();
		s.unwatchMessage();

		return false;
	};

/**
	 * Quiz plan was confirmed
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_02_selectGameOk(s, ctx, state) {
		// the game will be saved:
		if(state.planId==null){
			throw new Error("Plan was not found");
		}
		state.game.setState("WAITING");
		const msgDef = 
`# GAME_PARS
## QSHOW
Would you like to show questions 
to the players on their devices?
{{ SELECTED | chosen option }}
===
{{ g2!0202!yes | Yes | yes }}  {{ g2!0202!no | No | no }}`;

const msgAcDef = 
`# GAME_PARS
## ACCESS
You can use the buttons below to enable or disable access for different users.
===
{{ g2!0202a!contr | QuizManager ( YES ) | btnqm }}
{{ g2!0202a!player | Players ( YES ) | btnplayer }}
{{ g2!0202a!aud | Audience ( NO  ) | btnaud }}`;

		// load a new quiz instance
		const builder = new QuizGameBuilder();

		await builder.setQuizPlan(state.planId);
		builder.build(state.game);

		const dbr = await MGameInstance.create({
			createdOn: new Date(),
			id1: state.game.getCode(),
			id2: state.game.getCodeForPlayers(),
			id3: state.game.getCodeForAudience(),
			state: dictGameQuiz.gameStates.created,
			gameLog: [],
			title: state.game.title,
			planId: state.planId
		});
		state.instanceId = dbr._id.toString();
		state.game.uniqueId=state.instanceId;

		var scr = s.uiInside("START");
		var m = scr.getMessage("START_TITLE");
		var linkAddressPlayers  = "";
		const link = this.getSettingsItem("webhost");
		if(link != null){
			// the parameter was set
			linkAddressPlayers = link.value + "join/players/" + state.instanceId;
			linkAddressPlayers = "Page with QR code:  " + linkAddressPlayers;
			var linkAddressGameView = "Game view: " + link.value + "game/game_view/" + state.instanceId;//.game.uniqueId;
			m.setPlaceholder("LINK_PLAYERS", linkAddressPlayers);
			m.setPlaceholder("LINK_GAME_VIEW", linkAddressGameView)
			await scr.updateMessage(ctx, "START_TITLE");
		}

		//var scr = s.uiInside("START");
		scr.getMessage("PLAN_SUMMARY").hideAllButtons();
		await scr.updateMessage(ctx, "PLAN_SUMMARY");

		scr = s.uiInside("GAME_PARS");
		var msgAc = s.uiReg3(msgAcDef, true);
		await scr.postMessage(ctx, "ACCESS", ctx.from.id);
		var msg = s.uiReg3(msgDef, true);
		await scr.postMessage(ctx, "QSHOW", ctx.from.id);		

		s.watchCallback();
		return true;
	};

/**
	 * Access settings were modified
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async change_access  (s, ctx, state)  {
		var g  = state.game;

		const prefix = "g2!0202a!";
		let mode = ctx.callbackQuery.data.substring(prefix.length);
		var scr = s.uiInside("GAME_PARS");
		var m = scr.getMessage("ACCESS");

		switch(mode){
			case "contr":
				g.joinControl.qm = !g.joinControl.qm;
				m.buttons.find(b=>b.reference == "btnqm").text = `QuizManager ( ${g.joinControl.qm?"YES":"NO "} )`;
				break;
			case "player":
				g.joinControl.player = !g.joinControl.player;
				m.buttons.find(b=>b.reference == "btnplayer").text = `Players ( ${g.joinControl.player?"YES":"NO "} )`;
				break;
			case "aud":
				g.joinControl.aud = !g.joinControl.aud;
				m.buttons.find(b=>b.reference == "btnaud").text = `Audience ( ${g.joinControl.aud?"YES":"NO "} )`;
				break;
		}
		
		await scr.updateMessage(ctx, "ACCESS");

	};
/**
	 * Plan ID was discarded
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_03_selectGameCancel(s, ctx, state) {
		return true;
	};
/**
	 * Select scoring mode
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_04_settingsQScoreCount(s, ctx, state) {
		const scr = s.uiGetCurrentScreen();
		const userId = ctx.from.id;
		const msgDef = 
`# GAME_PARS
## QCALC
How should the score be calculated?
{{ SELECTED | chosen option }}
===
{{ g2!0204!round | Number of rounds won | rounds }}
{{ g2!0204!question | Number of tasks solved | tasks }}`;
	
		const prefix = "g2!0202!";
		let mode = ctx.callbackQuery.data.substring(prefix.length);

		const game = state.game;
		switch(mode){
			case 'yes':
				game.setQShow(true);
				break;
			case 'no':
				game.setQShow(false);
				break;
		}

		// remove buttons
		const prevMsg = scr.getMessage("QSHOW");
		prevMsg.hideAllButtons();
		prevMsg.setPlaceholder("SELECTED", "\nYour choice: " + mode);
		await scr.updateMessage(ctx, "QSHOW");

		const msg = s.uiReg3(msgDef, true);
		await scr.postMessage(ctx, "QCALC", userId);

		s.watchCallback();
		return true;
	};

/**
	 * choose score calculation method
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_05_settingsQAudience (s, ctx, state) {
		s.uiInside("GAME_PARS");
		const userId = ctx.from.id;
		const scr = s.uiGetCurrentScreen();
		const msgDef = `# GAME_PARS
## QAUD
Will the audience join in this game?
{{ SELECTED | chosen option }}
===
{{ g2!0205!yes | Yes | yes }} {{ g2!0205!no | No | no }}`;

		const prefix = "g2!0204!";
		let mode = ctx.callbackQuery.data.substring(prefix.length);

		const game = state.game;
		var textComment = "\nYour choice: ";
		switch(mode){
			case 'round':
				game.setQCalc("R");
				textComment = textComment+ "Winner by number of successfull rounds";
				break;
			case 'question':
				game.setQCalc("Q");
				textComment = textComment+ "Winner by number of correct answers";
				break;
		}


		// remove buttons
		const prevMsg = scr.getMessage("QCALC");
		prevMsg.hideAllButtons();
		prevMsg.setPlaceholder("SELECTED", textComment);
		await scr.updateMessage(ctx, "QCALC");

		const msg = s.uiReg3(msgDef, true);
		await scr.postMessage(ctx, "QAUD", userId);

		s.watchCallback();
		return true;
	};

	/** Final message before start
	 * 
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_06_StartGame(s, ctx, state) {
		const userId = ctx.from.id;
		var scr = s.uiGetCurrentScreen();
		const msgDefTL = 
`# ADMIN_GAME_MEMBERS
## TEAMS_LIST
The information about teams will appear in this message
{{ ? | Members }}`;

		const msgDefSW = 
`# ADMIN_GAME_MEMBERS
## START_WAIT
Waiting for Teams and Quiz Master to join the game
===
{{ g2!0206!start | Start the game | start }} {{ g2!0206!cancel | Cancel | cancel }}`;
		
		const prefix = "g2!0205!";
		let mode = ctx.callbackQuery.data.substring(prefix.length);
		s.uiInside("GAME_PARS");
		const game = state.game;
		var textComment = "\nYour choice: ";
		switch(mode){
			case 'yes':
				game.setQAudience(true);
				textComment = textComment+ "The audience can join";
				break;
			case 'no':
				game.setQAudience(false);
				textComment = textComment+ "The audience will not connect";
				break;
		}

		const msgQAud = scr.getMessage("QAUD");
		msgQAud.setPlaceholder("SELECTED", textComment);
		msgQAud.hideAllButtons();
		await scr.updateMessage(ctx, "QAUD");

		scr = s.uiInside("ADMIN_GAME_MEMBERS");
		
		const msgTL = s.uiReg3(msgDefTL, true);
		await scr.postMessage(ctx, "TEAMS_LIST", userId);

		const msgSW = s.uiReg3(msgDefSW, true);
		await scr.postMessage(ctx, "START_WAIT", userId);

		//s.uiCommit();
		
		s.watchCallback();
		return true;
	};

	/**
	 * Cancel game
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_07_CancelGame(s, ctx, state) {

		s.flushAppStates();
		s.unwatchCallback();
		s.unwatchMessage();

		return false;
	};
/**
	 * Quiz master attempts to join the game
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step03_01_QMRequest(s, ctx, state) {
		// quiz master
		var qm = ctx.message.from.id;
		// take parameters from the input
		var args = ctx.message.text.split(" ");
		// 1 = id of the game for which the person would like to become a quiz master
        const gameID = args[1];
		// game object
		var comRef = this.getSharedData();
		var game = comRef.dictGames[gameID];

		if(game != null){
			// check permissions
			if(game.joinControl.qm == false){
				// unavailable
				await ctx.reply("You cannot join this game at this time");
				return false;
			}

			state.game = game;
			
			return await this.step03_02_QMRequestOK(s, ctx, state);
		} else {
			return await this.step03_03_QMRequestError(s, ctx, state);
		}

	};
/**
	 * send request to the admin on behalf of quiz master
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step03_02_QMRequestOK(s, ctx, state) {
		// quiz master
		var qm = ctx.message.from.id;
		var qmName = (ctx.message.from.username?ctx.message.from.username:"")
			+ " " + (ctx.message.from.first_name?ctx.message.from.first_name:"")
			+ " " + (ctx.message.from.last_name?ctx.message.from.last_name:"")
		// take parameters from the input
		var args = ctx.message.text.split(" ");
		// 1 = id of the game for which the person would like to become a quiz master
        const gameID = args[1];
		// game object
		/**@type {QuizGame} */
		var game = state.game;
		game.setQuizMasterCandidate(qm);
		//
		//state.game = game;
		// admin
		var admin = game.ownerId;

		var admState = await this.getSessionOfUser(admin);
		admState.watchCallback(this.app);

const msgDefInfo = 
`# GAME_QM_START
## REQ_SENT
You request has been sent to the owner`;
		s.uiInside("GAME_QM_START");
		const msgInfo = s.uiReg3(msgDefInfo);
		s.uiGetCurrentScreen().postMessage(ctx, "REQ_SENT", qm);

const msgDef = 
`# GAME_QM
## QM_SELECT
{{ QNAME | Quiz maser name | }} would like to manage the game. {{ MSG | Message text | }}
===
{{ g2!0301!yes | Confirm | yes }} {{ g2!0301!no | Reject | no}}`;

		admState.uiInside("GAME_QM");
		const msg = admState.uiReg3(msgDef, true);
		msg.setPlaceholder("QNAME", qmName);

		const scr = admState.uiGetCurrentScreen();
		await scr.postMessage(ctx, "QM_SELECT", admin);

		return true;
	};

/**
	 * quiz master chose a non existent game id
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step03_03_QMRequestError(s, ctx, state) {
		await ctx.sendMessage("Sorry, game with ID was not found");

		s.unwatchCallback();
		s.unwatchMessage();

		return false;
	};
/**
	 * Admin confirms the request
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step03_04_QMRequestConfirm(s, ctx, state) {
const msgDef = 
`# QM_GAME_MEMBERS
## TEAMS_LIST
You have been granted the quiz master role in the game. Please, wait for the game to begin

The information about teams will appear in this message.

{{ ? | List of teams | }}
`;

		var mgr = new QuizGameManager(state.game, ctx.telegram);
		// notify quiz master
		const qm = state.game.getQuizMasterCandidate();
		if(qm){
			const qmid = qm.userId;
			// write QM user id
			state.game.setQuizMaster(qmid);
			state.game.qmIsSet = true;

			// these messages can be accessed later
			const qmSess = await this.getSessionOfUser(qmid);
			var scr = qmSess.uiInside("QM_GAME_MEMBERS");
			const msgQM = qmSess.uiReg3(msgDef, false); var arr = mgr.getAllPlayers(); if(arr!=null){ msgQM.array=arr; }
			await scr.postMessage(ctx, "TEAMS_LIST", qmid);

			// remove buttons
			const admScr = s.uiInside("GAME_QM");
			const admMsg = admScr.getMessage("QM_SELECT");
			admMsg.hideAllButtons();
			admMsg.setPlaceholder("MSG", "\n\nYou have accepted this request");
			await admScr.updateMessage(ctx, "QM_SELECT");


		}else{
			// quiz master is unknown
		}
		//le
		//s.unwatchCallback();
	};
/**
	 * Admin rejects the request
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step03_05_QMRequestReject(s, ctx, state) {
		// notify quiz master
		const qm = state.game.getQuizMasterCandidate();
		if(qm){
			const qmid = qm.userId;
			state.game.setQuizMaster(null);
			state.game.qmIsSet = false;
			const msgid = await ctx.telegram.sendMessage(qmid, 
					"Your request has been rejected");
		}else{
			// quiz master is unknown
		}
		//s.unwatchCallback();
		// the interaction stops here
	};
/**
	 * A new user wants to join the game as a player
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_01_joinTheGame(s, ctx, state) {
const msgDefUnavailable = 
`# JOIN_GAME
## ERROR_NA
Sorry, the game is unavailable now`;

const msgDefNoCode = 
`# JOIN_GAME
## WARNING_COMMAND
Game code was not sent. Please, use the following format: /play2 GameCode`;
		const scr = s.uiInside("JOIN_GAME");		
		s.uiReg3(msgDefNoCode, false);
		s.uiReg3(msgDefUnavailable, false);
		

		// player
		var pl = ctx.message.from.id;
		
		// 
		var gameID = "";
		if(ctx.params!=null && ctx.params.data!=null){
			gameID = ctx.params.data;
			var gi = await getGameInstanceHeader(gameID);
			gameID = gi.id2; await ctx.deleteMessage(ctx.message.message_id);
		}else{
			// take parameters from the input
			var args = ctx.message.text.split(" ");
			gameID = args[1];
		}
        
		if(gameID == null){
			await scr.postMessage(ctx, "ERROR_NA");
			return false;
		}

		var comRef = this.getSharedData();
		if(comRef.dictGameByPlayerCode == null){
			await scr.postMessage(ctx, "WARNING_COMMAND");
			return false;
		}
		
		// game object
		/**@type {QuizGame} */
		var game = comRef.dictGameByPlayerCode[gameID];

		// find the game object

		if(game != null && game.getState() == "WAITING"){

			// check permissions
			if(game.joinControl.player == false){
				// unavailable
				await ctx.reply("You cannot join this game at this time");
				return false;
			}

			state.code2 = gameID;
			state.roles.push("player");

			state.game = game;
			return await this.step04_02_joinTheGame(s, ctx, state);
		}else{
			return await this.step04_03_joinTheGame(s, ctx, state);
		}

	};
	
	
/**
	 * let the player choose the team
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_02_joinTheGame(s, ctx, state) {
		
		// read the number of teams and create a keyboard
		// ask the user to choose one team from the list
		const teams = state.game.getTeams();
		let buttons = teams
			.map((t)=> { return { text:t.name, code: "g2!0402!" + t.id }; });

		const msgDefPlayer = 
`# GAME_TEAM_CHOICE
## LIST
Please, choose your team
===
{{ ? | List of teams | teams }}
{{ g2!0402cancel | Cancel | cancel }}
`;
		const scr = s.uiInside("GAME_TEAM_CHOICE");
		await scr.deleteMessage(ctx, "MY_TEAM");
		await scr.deleteMessage(ctx, "LIST");
		const msg = s.uiReg3(msgDefPlayer, false);
		msg.setBtnPlace("teams", buttons);
		const p = msg.buttonPlaces.find(b=>b.reference == 'teams');
		p.maxInLine = 1;
		msg.createButtonsTable();

		await scr.postMessage(ctx, "LIST", ctx.from.id);

		//await s.uiDropPostIfExists(ctx, "LIST");

		s.watchCallback();
		return true;
	};
/**
	 * Not found
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_03_joinTheGame(s, ctx, state) {
		
		return false;
	};
/**
	 * Add to the team
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_04_joinTeam(s, ctx, state) {
		const userId = ctx.from.id;
const msgDefPlayer = 
`# GAME_TEAM_CHOICE
## MY_TEAM
Now your team is: {{ TEAM | Currently chosen team | }}
{{ ? | Lit of members }}
===
{{ g2!0404!quit | Quit the game | quit }}`;

		const prefix = "g2!0402!";
		let teamId = (ctx.callbackQuery.data + "").substring(prefix.length);
		const game = state.game;
		var team = game.getTeams().find(x=>x.id == Number( teamId));
		
		const qgm 
			= new QuizGameManager(state.game, ctx.telegram);
		
		//const allPlayersInTeam = team.players;
		const allPlayersInTeamItems = team.players.map(x=>{
			return { id: x.id, value: x.name }; 
		});

		const scr=s.uiInside("GAME_TEAM_CHOICE");
		const msg = s.uiReg3(msgDefPlayer, true);

		const prevMsg = scr.getMessage("LIST");
		prevMsg.hideAllButtons();
		await scr.updateMessage(ctx, "LIST");

		//msg.setPlaceholder("MSG", "Your team is ");
		msg.setPlaceholder("TEAM", team.id + ". " + team.name);
		msg.array = Array.from(allPlayersInTeamItems);

		await scr.postMessage(ctx, "MY_TEAM", userId);

		await qgm.addPlayer(state.code, teamId, ctx.callbackQuery.from, this.getAppCore(), ctx);

		return true;
	};

/**
	 * Player decided to cancel the dialog
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_04_joinTeamCancel(s, ctx, state) {

		// message



		return false;
	};
/**
	 * Start the game (admin)
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_06_StartingTheGame(s, ctx, state) {
		// only game owner can start the game
		if(state.roles.indexOf("owner") == -1){
			throw new Exception("Persmission denied");
		}
		state.game.setState(dictGameQuiz.gameStates.started);
		

		// enable buttons for quiz master
		
const msgDef = 
`# QM_CONTROL_PANEL
## START
Press start to begin the 1st round of {{ ROUNDS | Number of rounds | }}!
===
{{ g2!0506!round!1 | Start 1 Round | start }}
{{ g2!0506!skip!1  | Skip 1 Round | skip }}`;

		const qm = state.game.getQuizMaster().userId;
		var qmState = await this.getSessionOfUser(qm);
		qmState.watchCallback(this.app);

		var scr = qmState.uiInside("QM_CONTROL_PANEL");
		const msgQM = qmState.uiReg3(msgDef, true);
		await scr.postMessage(ctx, "START", qm);

		// remove buttons under the previous message
		scr = s.getAppState().getScreenByTag("ADMIN_GAME_MEMBERS");
		var msgPrev = scr.getMessage("START_WAIT");
		msgPrev.hideAllButtons();
		await scr.updateMessage(ctx, "START_WAIT");

const msgDefAdm = 
`# ADMIN_GAME_MEMBERS
## START_QM
Quiz master was notified`;
		s.uiInside("ADMIN_GAME_MEMBERS");
		s.uiReg3(msgDefAdm, false);
		await scr.postMessage(ctx, "START_QM", ctx.from.id);
		
		return true;
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_07_SkipRound(s, ctx, state) {
		
	};
/**
	 * start a new round (QM)
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_08_StartQuestion(s, ctx, state) {
		// look through parameters and start the round
		const prefix = "g2!0506!round!";
		let roundId = (ctx.callbackQuery.data + "").substring(prefix.length);

		// 
		const gm = new QuizGameManager(state.game, ctx.telegram, this.getAppCore());
		const roundObj = await gm.startRound(roundId);// state.game.startRound(roundId);
		if(roundObj == null){
			await ctx.reply("Error");
			return false;
		}
		
		//

		const round = state.game.round;
		//const roundObj = state.game.roundsArray[round];
		const roundName = roundObj.name;
		const roundQNum = roundObj.quizzesArray.length;

		const nextQNum = state.game.getNextQuestion();

		const nextQ = state.game.getQuestionObj(nextQNum);

		if(nextQ == null){
			// error message
			await ctx.reply("question not found");
			return false;
		}

		/**
		 * QM can start new question or cancel the game
		 */
const msgDefQM = 
`# QM_ROUND
## QM_ROUND_TITLE
Round {{ ROUND | Round number | }} begins. 

Title: {{ RNAME | Title | }}

Questions: {{ QUESTIONS | Number of questions in the round | }}

Press button to open the question {{ QUESTION | Question number | }}
===
{{ g2!0508!start!${ roundId }!${ nextQNum } | Open Question | gotoQuestion }}
{{ g2!0508!cancel | Cancel game | cancel }}`;
		
		const qm = state.game.getQuizMaster().userId;
		const qmS = await this.getSessionOfUser(qm); 
		const prevScr = qmS.uiInside("QM_CONTROL_PANEL"); 
		const msgPrev = prevScr.getMessage("START"); 
		msgPrev.hideAllButtons(); 
		await prevScr.updateMessage(ctx, "START");

		const qmScr = qmS.uiInside("QM_ROUND");
		const msgQm = qmS.uiReg3(msgDefQM, true);
		msgQm.setPlaceholder("ROUND", round);
		msgQm.setPlaceholder("RNAME", roundName);
		msgQm.setPlaceholder("QUESTIONS", roundQNum);
		msgQm.setPlaceholder("QUESTION", nextQNum);
		await qmScr.postMessage(ctx, "QM_ROUND_TITLE", qm);

const msgDefPlayers = 
`# PLAY_ROUND
## PLAY_ROUND_TITLE
Round {{ ROUND | Round number | }} begins!
Questions: {{ QUESTIONS | Question number | }}

Title: {{ RNAME | Title | }}`;

		// send message to players
		for (const p of state.game.getPlayers()) {
			// all players
			const pl = p.userId;
			const plS = await this.getSessionOfUser(pl);
			const plSrc = plS.uiInside("QM_ROUND");
			const msgPl = plS.uiReg3(msgDefPlayers, true);
			msgPl.setPlaceholder("ROUND", roundObj.roundNumber);
			msgPl.setPlaceholder("QUESTIONS", roundQNum);
			msgPl.setPlaceholder("RNAME", roundObj.name);
			
			await plSrc.postMessage(ctx, "QM_ROUND_TITLE", pl);
		}

		/* notification through web sockets */
		//this.emit(state.instanceId, "round", { roundName, roundQNum, roundId });
		
		return true;
	};


/**
	 * Show one question and start waiting for the answers
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_09_ShowQuestion(s, ctx, state) {
		// question and round
		const prefix = "g2!0508!start!";
		let pars = (ctx.callbackQuery.data + "").substring(prefix.length);
		let pars2 = pars.split("!");
		let rId = pars2[0];

		// question number
		let qId = pars2[1];

		// current question:
		var question = state.game.getQuestionObj(qId);

	// question may include a media attachment - a picture.

		var msgPlayerQuestion = 
`# GAME
## QUESTION
******* Round {{ROUND_NUM | Curent round number | }}. Question {{QUESTION_NUM | Current question number |}} **************************
{{ QUESTION_TEXT | Question text | }}
Choose correct option:\n
{{ ? }}
===
{{ ? | Buttons with options | btnOptions }}`; // options can be added via an array

		

		// we will have 4 buttons anyway
		var btns = 
			[
				{ code: "g2!answer!pl!" + rId + "!1", btext: "🐶", optionNumber: 0 }, 
				{ code:"g2!answer!pl!" + rId + "!2", btext:"🦊", optionNumber: 1 }, 
				{ code: "g2!answer!pl!" + rId + "!3", btext:"🐯", optionNumber: 2 }, 
				{ code:"g2!answer!pl!" + rId + "!4", btext:"🐸",  optionNumber: 3 }
			];

			var joined = tidy(btns, leftJoin(
				question.options.map(o=>{ 
						return { optionNumber:o.optionNumber, id:o.id, text:o.text }; 
					}), 
				{ 
					by:
						{ 
							optionNumber: "optionNumber" 
						} 
				} ) )
				.map(x=>{
					return {
						code: x.code,
						text: x.id == null ? "-" : x.btext,
						hide: x.id == null, 
						fullText: x.btext + " - " + x.text
					}
				});

		// options to be shown in the message
		var texts = joined
			.filter(o=>o.hide == false)
			.map(o=>{
				return {
					id: o.code,
					value: o.fullText
				};
			});
		// depending on parameters show the question and buttons
	
		// send text to the teams
		for (const p of state.game.getPlayers()) {
			// all players
			const pl = p.userId;
			const plS = await this.getSessionOfUser(pl);
			const plSrc = plS.uiInside("GAME");
			
			const msgPl = plS.uiReg3(msgPlayerQuestion, false);

			msgPl.setBtnPlace("btnOptions", joined);

			msgPl.setPlaceholder("ROUND_NUM", rId);
			msgPl.setPlaceholder("QUESTION_NUM", qId);

			if(state.game.parameters.qShow == true){
				// show question text
				msgPl.setPlaceholder("QUESTION_TEXT", question.questionText);
			}else{
				msgPl.setPlaceholder("QUESTION_TEXT", "Please, find the question on the screen");
			}

			// all options to be shown
			msgPl.array = Array.from(texts);
			
			var bp = msgPl.buttonPlaces.find(x=>x.reference == "btnOptions");
			bp.maxInLine = 2;

			msgPl.createButtonsTable();

			await plSrc.postMessage(ctx, "QUESTION", pl);
		}

		
		// questions with media should be visualized as picture and then message with text.
		state.game.setState("Q_VISIBLE");

		return true;
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_10_TeamAnswered(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_11_AnswerAgain(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_12_NextQuestion(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_13_RoundFinished(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_14_LastRoundFinished(s, ctx, state) {
		
	};

	

}

module.exports = {
	AppGameQuiz 
};