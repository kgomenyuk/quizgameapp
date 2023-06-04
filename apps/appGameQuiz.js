const { AppBase } = require("../lib/appBase");  
const { AppCore, TGCommandEventTrigger, TGMessageEventTrigger, TGCallbackEventTrigger, AppEventTrigger, NotificationTrigger } = require("../lib/AppCore");  
const { Util } = require("../lib/util");
const Uuid = require("uuid");
const { asoGameQuiz } = require("./asoGameQuiz");
const { SessionObject } = require("../lib/Sessions");
const { Context } = require("telegraf");
const { QuizGame } = require("../quiz_game");



class AppGameQuiz extends AppBase { 
	_init(){
        this.taskId = "";
        this.taskCode = "";

		this.app = "game2";
		this.isPublicAllowed = false;     
	}

	getState(){

	}
	
	_getTriggers(){
		// start the game
		var trCmdGame2 = new TGCommandEventTrigger("trCmdGame2", "game2", null);
		trCmdGame2.handlerFunction = this.step01_01_enterID;

		var trMsgstep01_02_enterID = new TGMessageEventTrigger("step01_02_enterID");
		trMsgstep01_02_enterID.handlerFunction = this.step01_02_enterID;

		var trCbGameOk = new TGCallbackEventTrigger("trCbGameOk", null, "g2!0201!ok");
		trCbGameOk.handlerFunction = this.step02_02_selectGameOk;

		var trCbGameCancel = new TGCallbackEventTrigger("trCbGameCancel", null, "g2!0201!cancel");
		trCbGameCancel.handlerFunction =this.step02_03_selectGameCancel;

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

		var trCmdControl2Confirm = new TGCallbackEventTrigger("trCmdControl2Confirm", null, "g2\!0301\!yes");
		trCmdControl2Confirm.handlerFunction = this.step03_04_QMRequestConfirm;

		var trCmdControl2Reject = new TGCallbackEventTrigger("trCmdControl2Reject", null, "g2\!0301\!no");
		trCmdControl2Reject.handlerFunction = this.step03_05_QMRequestReject;

		
		// players join the game
		var trCmdPlay2 = new TGCommandEventTrigger("trCmdPlay2", "play2", null);
		trCmdPlay2.handlerFunction = this.step04_01_joinTheGame;

		return [
			trCmdGame2, trMsgstep01_02_enterID,
			trCbGameOk, trCbGameCancel,
			trCbSelectShowQuestions,
			trCbSelectScoreMode, trCbSelectAudienceMode, trCbAdmSelectGameStart, trCbAdmSelectGameCancel,

			trCmdControl2, trCmdControl2Confirm, trCmdControl2Reject,

			trCmdPlay2
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

        const g = new QuizGame();

        const code = g.getCode();

        g.initialize(teams, limit, ctx.message.from.id);

		if(s.commonData.allGames == null){
			s.commonData.allGames = [];
			s.commonData.dictGames = {};
			s.commonData.dictGameByPlayerCode = {};
			s.commonData.dictGameByAudienceCode = {};
		}
        
		s.commonData.allGames.push(g);
        s.commonData.dictGames[code] = g;
		s.commonData.dictGameByPlayerCode[g.getCodeForPlayers()] = g;
		s.commonData.dictGameByAudienceCode[g.getCodeForAudience()] = g;

        // attach game to the current user
        state.game = g;
		state.roles = ["admin"];

        // send code to the chat
        await ctx.reply("The game is still being created. You can use the following codes to invite people in the game:\n"
		+ "Quiz master - " + code
		+ "\nPlayers - " + g.getCodeForPlayers()
		+ "\nAudience - " + g.getCodeForAudience()
		+ "Please, type the short code of a quiz you would like to use this time");

		s.watchMessage(); // waiting for a message

	};
	
	/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step01_02_enterID(s, ctx, state) {

		var txtGamePlanID = ctx.message.text;
		var gamePlanEists = true;

		if(gamePlanEists == true){
			return await this.step02_01_selectGame(s, ctx, state);
		}else{
			return await this.step02_01_noGamePlan(s, ctx, state);
		}
	};
	
	/**
	 * Game was found
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_01_selectGame(s, ctx, state) {
		
		

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
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_02_selectGameOk(s, ctx, state) {
		
		s.watchCallback();
		return true;
	};
/**
	 * Handle GameID message
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

		var mode = ctx.callbackQuery.data;

		switch(mode){
			case 'yes':
				break;
			case 'no':
				break;
		}

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
		var mode = ctx.callbackQuery.data;
		var game = state.game;

		switch(mode){
			case 'round':
				break;
			case 'question':
				break;
		}

		s.watchCallback();
		return true;
	};

/** Show the game IDs
	 * 
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step02_06_StartGame(s, ctx, state) {
		
		var buttons = [];
		
		buttons.push({
			callback_data: "g2!0206!start",
			text: "Start the game"
		});
		buttons.push({
			callback_data: "g2!0206!cancel",
			text: "Cancel"
		});

		var GameID1 = "123123";
		var GameID2 = "234234";
		var GameID3 = "678678";

		ctx.sendMessage(`Game id for quiz master:${GameID1}
		Game id for players:${GameID2}
		Id for audience:${GameID3}`, {
			reply_markup:{
				inline_keyboard:[buttons]
			}
		});

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
		var game = s.commonData.dictGames[gameID];

		if(game != null){

			return await this.step03_02_QMRequestOK(s, ctx, state);
		} else {
			return await this.step03_03_QMRequestError(s, ctx, state);
		}

	};
/**
	 * send request to the admin
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
		var game = s.commonData.dictGames[gameID];
		// admin
		var admin = game.ownerId;

		var admState = this.getSessionOfUser(admin);
		admState.watchCallback(this.app);

		var buttons = [];
		
		buttons.push({
			callback_data: "g2!0301!yes",
			text: "Confirm"
		});
		buttons.push({
			callback_data: "g2!0301!no",
			text: "Reject"
		});

		await ctx.telegram.sendMessage(admin, qmName + " would like to manage the game", {
			reply_markup:{
				inline_keyboard:[buttons]
			}
		});

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
		
	};
/**
	 * Admin rejects the request
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step03_05_QMRequestReject(s, ctx, state) {
		
	};
/**
	 * A new user wants to join the game as a player
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_01_joinTheGame(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_02_joinTheGame(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_03_joinTheGame(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step04_04_joinTeam(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_06_StartingTheGame(s, ctx, state) {
		
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
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_08_StartQuestion(s, ctx, state) {
		
	};
/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step05_09_ShowQuestion(s, ctx, state) {
		
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