const { Game } = require("./game");
const { QuizRound } = require("./quiz_round");

class QuizGame extends Game {

    quizzesArray = []; // all questions
    /**
     * @type {[QuizRound]} All rounds
     */
    roundsArray=[];

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
    
}

module.exports = {
    QuizGame
};