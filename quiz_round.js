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
}

module.exports = {
    QuizRound
};