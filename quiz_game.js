const { Game, randomString } = require("./game");
const { QuizRound } = require("./quiz_round");

class QuizGame extends Game {

    quizzesArray = []; // all questions
    /**
     * @type {[QuizRound]} All rounds
     */
    roundsArray=[];


    /**
     * access code for players
     */
    gameIdPlayers = '';
    /**
     * access code for audience
     */
    gameIdAudience = '';

    constructor(){
        super();
        this.gameIdPlayers = randomString(4, '0123456789abcdefghijklmnopqrstuvwxzABCDEFGHIJKLMNOPQRSTUVWXZ');
        this.gameIdAudience = randomString(5, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }

    /**
     * 
     * @param {Number} round Ordinal number
     * @param {String} roundName Name of the round
     */
    addRound = (round, roundName) => {
        var qr = new QuizRound();
        qr.roundNumber = round;
        qr.name = roundName;
        // add a round to the game
        this.roundsArray.push(qr);
    };

    addQuiz = (round, quiz)=>{
        // add a new quiz to the game
        this.roundsArray.find(x=>x.roundNumber == round).quizzesArray.push(quiz);
    };

    /**
     * get access code for players
     */
    getCodeForPlayers = ()=>{
        return this.gameIdPlayers;
    };

    /**
     * get access code for audience
     */
    getCodeForAudience = ()=>{
        return this.gameIdAudience;
    };

    initialize = (numberOfTeams, membersLimit, owner) => {
        this.ownerId = owner;

        for(var i=0;i<numberOfTeams;i++){
            // create a team
            this.teams.push({
                id: i+1,
                name:"Team " + (i + 1),
                players: []
            });
        }

        this.membersLimit = membersLimit;

        this.score = new Array(this.rounds)
            .fill({})
            .map((x, r) => {
                return this.teams.map(t => {
                    return { 
                        id:t.id, round:r, points: 0, answered: false, isWinner: false 
                    }; 
                } );
            });

        this.finalScore.teamsScore = this.teams
        .map(x => {
            return { 
                id:x.id,
                points: 0,
                roundsWon:0,
                isWinner: false
            };
        });

        // write to the database

    };
    
}

module.exports = {
    QuizGame
};