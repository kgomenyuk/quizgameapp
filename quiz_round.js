const { Quiz } = require("./quiz");

/**
 * represents one round
 */
class QuizRound {
    /**
     * @type {Number} Ordinal number
     */
    roundNumber;

    /**
     * @type {String} Name of a round
     */
    name;

    /**
     * @type {[Quiz]}
     */
    quizzesArray = []; 

    /**
     * current question
     */
    currentQuestion = 0;

    /**
     * -1 means no question has been opened yet
     */
    lastOpenedQuestion = -1;
}

module.exports = {
    QuizRound
};