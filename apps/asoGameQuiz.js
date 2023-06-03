const { QuizGame } = require("../quiz_game");

/**
 * represents state object for a game application
 */
class asoGameQuiz {
    /**
     * @type {QuizGame}
     */
    game;

    /**
     * @type {"N"|"P"}
     * N - do not show questions
     * P - send questions to the teams
     */
    qShow = "N";
}

module.exports = {asoGameQuiz};