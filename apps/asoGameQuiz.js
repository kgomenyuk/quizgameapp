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

    /**
     * access code that was used when entering the game
     */
    code="";


    /**
     * The selected plan identifier
     */
    planId="";


    /**
     * @type {[ String ]}
     */
    roles=[];

    /**
     * Key of an instance
     */
    instanceId = "";
}

class dictGameQuiz {
    /**
     * named messages
     */
    static screenTags = {
        teamMembers: "GAME_MEMBERS"
    };

    static gameStates = {
        started: "GAME",
        waitingForQMaster: "wQM",
        waitingForPlayers: "wPlayers",
        created: "NEW"
    };
}

module.exports = {asoGameQuiz, dictGameQuiz};