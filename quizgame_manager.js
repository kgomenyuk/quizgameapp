const { Telegram } = require("telegraf");
const { dictGameQuiz } = require("./apps/asoGameQuiz");
const { SessionObject, AppStateObject, SessionManager } = require("./lib/Sessions");
const { QuizGame } = require("./quiz_game");
const { AppCore } = require("./lib/AppBase");
const {UIScreen} = require("./lib/UIScreen");
const { MQuizAnswer, MGameInstance } = require("./data/model");

/**
 * additional TG-related actions
 */
class QuizGameManager{
    /**
     * 
     * @param {QuizGame} g 
     * @param {Telegram} tg
     */
    constructor(g, tg){
        this.game = g;
        this.telegram = tg;
        
    }

    /**
     * @type {QuizGame}
     */
    game = null;
    /**
     * @type {Telegram}
     */
    telegram = null;

    /**
     * @param {number} teamNumber 
     */
    notifyTeam = async (teamNumber, text)=>{
        // take team info from the game
        var team = this.game.getTeams().find(x=>x.id==teamNumber);

        if(team==null){
            this.game.log({ team:team.id, message:`notification failed - team ${ id } not found` });
            throw new Error("Team not found");
        }else{
            try{
                if(team.playersCount>0){
                    for (const t of team.players) {
                        await this.telegram.sendMessage(t.id, text, {parse_mode:"Markdown"});
                    }
                    this.game.log({ team:team.id, message:"notification sent" });
                }
                this.game.log({ team:team.id, message:"notification not sent - no players in team" });
                return true;
            }catch(e){
                this.game.log({ team:team.id, message:"notification not sent - exception" });
                return false;
            }
        }
    }

    notifyOwner = async(text)=>{
        try{
            if(this.game.ownerId > 0){
                    await this.telegram.sendMessage(this.game.ownerId, text, {parse_mode:"Markdown"});
                
                this.game.log({ message:"notification sent to owner" });
            }else{
                this.game.log({  message:"notification not sent - owner is unknown" });
            }
            return true;
        }catch(e){
            this.game.log({ message:"notification not sent to owner - exception" });
            return false;
        }
    }

    notifyQM = async(text)=>{
        try{
            if(this.game.qmId > 0){
                    await this.telegram.sendMessage(this.game.qmId, text, {parse_mode:"Markdown"});
                
                this.game.log({ message:"notification sent to quiz master" });
            }else{
                this.game.log({  message:"notification not sent - quiz master is unknown" });
            }
            return true;
        }catch(e){
            this.game.log({ message:"notification not sent to quiz master - exception" });
            return false;
        }
    }

    /**
     * finish current round and send current score to each team
     *    Q 1 Q 2 Q 3 ...
     * T1
     * T2   pts;    pts     pts
     * T3   pts    pts     pts
     * Qn...
     * W -  winner
     * -- - no answer
     * Message sample:
     * Your team wins
     * Team X wins
     * T1 W  1;
     * T2  --;
     * Tn  -1;
     */
    finishRound = async () => {
        const roundResults = this.game.finishRound();
        const printed = this.game.printRoundResults(roundResults);

        const wTeam = roundResults.find(x=>x.isWinner == true);
        var winningTeamId = null;
        if(wTeam!=null){
            winningTeamId = wTeam.teamNumber;
        }
       
        const teams = this.game.getTeams();

        for (const team of teams) {
            const tResult = printed.find(x=>x.teamNumber == team.id);
            await this.notifyTeam(team.id, "Round " + (this.game.round +1) + ". Results: \n"
                + "**" + tResult.heading + "**\n"
                + "`-------------\n"
                + tResult.message
                + "`",
                );
        }

        const message = printed.find(x=>x.isWinner == false);
        if(message!=null){
            var text = "Round " + (this.game.round +1) 
                + ". Results: \n"
                + "**" + message.heading + "**\n"
                + "`-------------\n"
                + message.message
                + "`";
            await this.notifyOwner(text);
            if(this.game.qmId!=this.game.ownerId){
                await this.notifyQM(text);
            }
        } 

    }

    /**Write an instance of a game to the database
     * @param { QuizGame } game
     */
    saveGameInstance = async (game) => {
        
    };


    restoreGameInstance = async (id) => {
        
    };

    /** Find a game instance by ID2 for players
     * 
     * @param {*} ID2 
     * @returns { QuizGame }
     */
    getGameByID2 = async (ID2) => {

    }



    /**
     * 
     * @param {*} code 
     * @param {*} teamId 
     * @param {*} user 
     * @param {AppCore} ac
     */
    addPlayer = async (code, teamId, user, ac, ctx) =>{
        const userName = 
            (user.username?user.username:"")
                + " " + (user.first_name?user.first_name:"")
                + " " + (user.last_name?user.last_name:"");
        const userId = user.id;
        
        const prevTeamId = this.game.addPlayer(code, teamId, userId, userName );
        this.game.setQuizPlayer(userId);

        if( prevTeamId == teamId ){
            // team was not changed
            return;
        }
        
        // notify the owner
        const ownerObj = ac.sMan.fetch(this.game.getOwner().userId);
        const ownerS = ownerObj.getAppStateFor("g2");
        const ownerScreen = ownerS.findScreen("ADMIN_GAME_MEMBERS");
        const listMsg = ownerScreen.getMessage("TEAMS_LIST");

        // notify the quiz master
        const qmObj = ac.sMan.fetch(this.game.getQuizMaster().userId);
        const qmS = qmObj.getAppStateFor("g2");
        const qmScreen = qmS.findScreen("QM_GAME_MEMBERS");
        const listQmMsg = qmScreen.getMessage("TEAMS_LIST");

        const allPlayers = this.game.getTeams()
            .map(x=>{
                return x.players.map(p=>{
                    return {t: x.name, ...p}
                })
            })
            .flat()
            .map(x=>{
                return {
                    id:x.id,
                    value: x.t + " " + x.name
                };
            });

        listMsg.array = Array.from(allPlayers);
        listQmMsg.array = Array.from(allPlayers);
        await ownerScreen.updateMessage(ctx, "TEAMS_LIST");
        await qmScreen.updateMessage(ctx, "TEAMS_LIST");

        // also update messages with teams
        var team = this.game.getTeam(teamId);
        for (const player of team.players) {
            //if(player.id == userId) continue;
            const p = ac.sMan.fetch(player.id);
            const ps = p.getAppStateFor("g2");
            const pcs = ps.findScreen("GAME_TEAM_CHOICE");
            const pMsg = pcs.getMessage("MY_TEAM");
            pMsg.addItem(player.id + "", userName);
            //await pcs.arrayAddItemTg("LIST", ctx, {id: player.id + "", value: userName});
            await pcs.updateMessage(ctx, "MY_TEAM");
        }
        
        if(prevTeamId!=""){
            var team = this.game.getTeam(prevTeamId);
            for (const player of team.players) {
                const p = ac.sMan.fetch(player.id);
                const ps = p.getAppStateFor("g2");
                const pcs = ps.findScreen("GAME_TEAM_CHOICE");
                const pMsg = pcs.getMessage("MY_TEAM");
                pMsg.removeItem(player.id + ""); //.arrayRemoveItemTg("LIST", ctx, player.id + "");
                await pcs.updateMessage(ctx, "MY_TEAM");
            }
        }
        
    }

    /**
     * post an answer and write it to the DB
     */
    postAnswer = async (userId, answerId) => {
        const ans = await this.game.postAnswer(userId, answerId);
        const dbAns = await MQuizAnswer.create({
            gameId:ans.gameId,
            options:ans.options,
            percentCorrect:ans.percentCorrect,
            place:ans.percentCorrect,
            result:ans.result,
            time:ans.time,
            userId:ans.userId,
            team: ans.teamId
        });
        ans.answerId = dbAns._id.toString();
        
    };


    saveGameInstance = async ()=> {
        if(this.game.uniqueId==""){
            //create a new instance
            const res = await MGameInstance.create({
                state: this.game.getState(),
                createdOn: new Date(),
                gameLog:[],
                id1: this.game.gameId
            });
            const strId = res._id.toString();
            this.game.uniqueId = strId;
        }
    };
}

module.exports = {
    QuizGameManager
};