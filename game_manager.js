const { Telegram } = require("telegraf");
const { Game } = require("./game");

/**
 * additional TG-related actions
 */
class GameManager{
    /**
     * 
     * @param {Game} g 
     * @param {Telegram} tg
     */
    constructor(g, tg){
        this.game = g;
        this.telegram = tg;
        
    }

    /**
     * @type {Game}
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
                        await this.telegram.sendMessage(t, text);
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
                    await this.telegram.sendMessage(this.game.ownerId, text);
                
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
                    await this.telegram.sendMessage(this.game.qmId, text);
                
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
                + tResult.heading + "\n"
                + "-------------\n"
                + tResult.message);
        }

        const message = printed.find(x=>x.isWinner == false);
        if(message!=null){
            var text = "Round " + (this.game.round +1) 
                + ". Results: \n"
                + message.heading + "\n"
                + "-------------\n"
                + message.message;
            await this.notifyOwner(text);
            if(this.game.qmId!=this.game.ownerId){
                await this.notifyQM(text);
            }
        } 

    }
}

module.exports = {
    GameManager
};