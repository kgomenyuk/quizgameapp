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
                        await this.telegram.sendMessage(t, team.name + "!\n" + text);
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
        const wTeam = roundResults.find(x=>x.isWinner == true);
        var winningTeamId = null;
        if(wTeam!=null){
            winningTeamId = wTeam.teamNumber;
        }
        
        const output = roundResults.map(x=>{
            return {
                rowId:(x.teamNumber + 1) + " (" + x.points + ")",
                cells:x.questionsScore.map(q=>{
                    return{
                        points: (q.answered==true?q.points+"":"--").padStart(4)
                    }
                })
            };
        })
        .map(x=>x.rowId.padEnd(6) + x.cells.join(""));
        const teams = this.game.getTeams();

        for (const team of teams) {
            var headerText = "";
            if(winningTeamId!=null){
                if(team.id == winningTeamId){
                    headerText = "Your team wins";
                }
                else{
                    headerText = `${team.name} wins`
                }
            }else{
                headerText = "No winner";
            }
            await this.notifyTeam(team.id, "Round " + (this.game.round +1) + ". Results: ");
        }
    }
}