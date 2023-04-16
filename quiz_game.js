const { Game } = require("./game");

class QuizGame extends Game {
    quizzesArray = []; // all questions
    roundsArray=[]; // all rounds

    addRound = (round, roundName) => {
        // add new round
    };

    addQuiz = (quiz, round)=>{
        // add a new quiz to the game
        
    };
    
}

module.exports = {
    QuizGame
};