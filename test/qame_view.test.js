const { disconnectDb, startDb } = require("../data/db");
const { writeData } = require("../data/sample_001");
const { writeDataBot } = require("../data/sample_002_bots");
const { QuizGameBuilder } = require("../game_builder");
const { AppCore } = require("../lib/AppBase");
const { UIScreen } = require("../lib/UIScreen");
const { QuizGame } = require("../quiz_game");
const { QuizGameManager } = require("../quizgame_manager");

// View can be updated from the game app via WS
test("Round can be shown in the view", async ()=>{
    await startDb();
    var b = new QuizGameBuilder();
    await b.setQuizPlan('SQL_L7_Quiz');
    /**@type {QuizGame} */
    var game = new QuizGame();
    game.initialize(2, 3, 1000);
    game.setQShow(false);
    game.setQAudience(false);
    game.setQCalc("R");

    await b.build(game);

    const apps = new AppCore({
        isDevMode: true
    });
    const gm = new QuizGameManager(game, null, apps);
    await gm.saveGameInstance();

    game.addPlayer("", 1, 2000);

    game.addPlayer("", 2, 3000);
    game.addPlayer("", 2, 3100);

    game.setState("WAITING");
    
    game.setState("READY");

    //await gm.startGame();

    await gm.startRound(1);

    await game.prepareQuestion();
    
    await gm.postAnswer(2000, 1);// save the answer in the database

    expect(game.result.answerObject.options.find(x=>x.selected == true).optionId + "").toBe('1');

    const nq = game.nextQuestion();
    expect(nq).toBeTruthy();

    await game.prepareQuestion(); 

    expect(game.result.answered).toBeFalsy();
    expect(game.result.answerObject).toBeNull();
    

    await disconnectDb();
});
