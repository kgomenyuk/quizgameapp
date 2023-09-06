var express = require("express");
const { QuizGame } = require("../../quiz_game");
const { AppCore } = require("../../lib/AppBase");
const { QuizGameBuilder } = require("../../game_builder");
const { QuizGameManager } = require("../../quizgame_manager");
var router = express.Router();


router.get("/1", async (req, res) => {
    try{
        /** @type {AppCore} */
        var c = req.appCore;
        var b = new QuizGameBuilder();
        await b.restoreInstance("64dfe4c12f7896054ed87773");

        /**@type {QuizGame} */
        var game = new QuizGame();
        game.initialize(2, 3, 1000);
        game.setQShow(false);
        game.setQAudience(false);
        game.setQCalc("R");

        await b.build(game);

       
        const gm = new QuizGameManager(game, null, c);

        game.addPlayer("", 1, 2000);

        game.addPlayer("", 2, 3000);
        game.addPlayer("", 2, 3100);

        game.setState("WAITING");
        
        game.setState("READY");

        //await gm.startGame();

        await gm.startRound(1);

        //await game.prepareQuestion();
    }
    catch(e){
        console.log("OOO");
    }
});


module.exports = router;