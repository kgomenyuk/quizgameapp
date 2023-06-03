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
		trMsgstep01_02_enterID.handlerFunction = this.str

		
		return [
			trCmdGame2, trMsgstep01_02_enterID
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

        g.initialize(teams, limit, rounds, ctx.message.from.id);

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
		+ "\nAudience - " + g.getCodeForAudience());

		s.watchMessage(); // waiting for a message

	};
	
	/**
	 * Handle GameID message
	 * @param {SessionObject} s 
	 * @param {Context} ctx 
	 * @param {asoGameQuiz} state 
	 */
	async step01_02_enterID  (s, ctx, state) {
		
	};
	

}

module.exports = {
	AppGameQuiz 
};