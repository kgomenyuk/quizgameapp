const { Game } = require("../game");

test('init and register players', () => { 
    var g = new Game();

    g.initialize(2, 4, 4, 12345);

    // admin asks the bot to send the code
    var code = g.getCode();

    // players register with the code
    g.getTeams();

    g.addPlayer(code, 1, 3456);

    var t = g.getTeams();

    g.addPlayer(code, 2, 342);

    expect(g.getTeams()).toHaveLength(2);

 });

 test('start the game', () => { 
    var g = new Game();

    g.initialize(2, 4, 4, 12345); 

    // admin asks the bot to send the code
    var code = g.getCode();

    // players register with the code
    g.addPlayer(code, 1, 3456);
    g.addPlayer(code, 2, 342);

    g.nextRound();
    g.postScore(1, true);

    g.nextQuestion();
    g.postScore(1, false);
    g.postScore(2, true); 

    g.finishRound();

    expect(g.round).toBe(0);

 });


 test('next round works as expected', () => { 
   var g = new Game();

   g.initialize(2, 4, 4, 12345); 

   // admin asks the bot to send the code
   var code = g.getCode();

   // players register with the code
   g.addPlayer(code, 1, 3456);
   g.addPlayer(code, 2, 342);

   // 
   expect(g.round).toBe(0);
   g.nextRound();
   expect(g.round).toBe(0);
   g.postScore(1, true);
   g.finishRound();

   expect(g.round).toBe(0);

   g.nextRound();
   g.postScore(1, true);
   g.finishRound();

   expect(g.round).toBe(1);

   var rres = g.nextRound();
   expect(rres).toBe("OK");
   expect(g.round).toBe(2);
   g.postScore(2, true);
   g.finishRound();

   expect(g.round).toBe(2);

   rres = g.nextRound();
   expect(g.round).toBe(3);
   expect(rres).toBe("LR");
   g.postScore(2, true);
   g.finishRound();

   rres = g.nextRound();
   expect(rres).toBe("NO");
   expect(g.round).toBe(3)

   expect(g.round).toBe(3);


});

test('score calculations are OK',()=>{
   var g = new Game();

   g.initialize(2, 4, 4, 12345); 

   // admin asks the bot to send the code
   var code = g.getCode();

   // players register with the code
   g.addPlayer(code, 1, 3456);
   g.addPlayer(code, 2, 342);

   // 
   g.nextRound();
   g.postScore(1, true);
   g.finishRound();

   expect(g.score[0].find(x=>x.id==1).isWinner).toBe(true);
   expect(g.score[0].find(x=>x.id==1).points).toBe(1);
   expect(g.score[0].find(x=>x.id==2).points).toBe(0);

   g.nextRound();
   g.postScore(2, true);
   g.finishRound();
   expect(g.score[1].find(x=>x.id==1).isWinner).toBe(false);
   expect(g.score[1].find(x=>x.id==2).isWinner).toBe(true);
   expect(g.score[1].find(x=>x.id==1).points).toBe(0);
   expect(g.score[1].find(x=>x.id==2).points).toBe(1);

   expect(()=>{
      g.postScore(1, true);
   }).toThrow();

   expect(g.round).toBe(1);
});


test('Game score calculations are OK',()=>{
   var g = new Game();

   g.initialize(2, 4, 2, 12345); 

   // admin asks the bot to send the code
   var code = g.getCode();

   // players register with the code
   g.addPlayer(code, 1, 3456);
   g.addPlayer(code, 2, 342);

   // 
   g.nextRound();
   g.postScore(1, true);
   g.finishRound();

   expect(g.score[0].find(x=>x.id==1).isWinner).toBe(true);
   expect(g.score[0].find(x=>x.id==1).points).toBe(1);
   expect(g.score[0].find(x=>x.id==2).points).toBe(0);

   g.nextRound();
   g.postScore(2, true);
   g.finishRound();
   expect(g.score[1].find(x=>x.id==1).isWinner).toBe(false);
   expect(g.score[1].find(x=>x.id==2).isWinner).toBe(true);
   expect(g.score[1].find(x=>x.id==1).points).toBe(0);
   expect(g.score[1].find(x=>x.id==2).points).toBe(1);

   g.finishGame();

   var fscore = g.getFinalScore();
   expect(fscore.hasWinner).toBe(false);
   expect(fscore.teamsScore.find(x=>x.id==1).isWinner).toBe(false);
   expect(fscore.teamsScore.find(x=>x.id==2).isWinner).toBe(false);

   expect(g.round).toBe(1);
});

test('Score after round includes correct info about questions answered', () => { 
   var g = new Game();

   g.initialize(2, 4, 2, 12345); 

   // admin asks the bot to send the code
   var code = g.getCode();

   // players register with the code
   g.addPlayer(code, 1, 3456);
   g.addPlayer(code, 2, 342);

   // 
   g.nextRound();
   // team 2 did not give an answer
   g.postScore(1, true);
   var res1 = g.finishRound();
   expect(res1).not.toBeNull();
   
   // 2 teams -> 2 results
   expect(res1).toHaveLength(2);
 
   expect(res1[0].answered).toBe(true);
   expect(res1[1].answered).toBe(false);

   g.nextRound();
   
});

test('Check the output after round was finished', () => { 
   var g = new Game();

   g.initialize(2, 4, 2, 12345); 

   // admin asks the bot to send the code
   var code = g.getCode();

   // players register with the code
   g.addPlayer(code, 1, 3456);
   g.addPlayer(code, 2, 342);

   // 
   g.nextRound();
   // team 2 did not give an answer
   g.postScore(1, true);
   var res1 = g.finishRound();
   expect(res1).not.toBeNull();
   
   // 2 teams -> 2 results
   expect(res1).toHaveLength(2);
 
   expect(res1[0].answered).toBe(true);
   expect(res1[1].answered).toBe(false);

   var messages = g.printRoundResults(res1);
   expect(messages.length).toBe(2);

   g.nextRound();
   
});


test('Finish game should finish the round as well', () => { 
   var g = new Game();

   g.initialize(2, 2, 2, 12345); 

   // admin asks the bot to send the code
   var code = g.getCode();

   // players register with the code
   g.addPlayer(code, 1, 3456);
   g.addPlayer(code, 2, 342);

   // 
   g.nextRound();
   // team 2 did not give an answer
   g.postScore(1, true);
   var res1 = g.finishRound();

   g.nextRound();

   g.postScore(2, true);
   expect(g.round).toBe(1);
   expect(g.gameIsFinished).toBe(false);

   g.finishRound();
   g.finishGame();
   expect(g.roundFinished).toBe(true);
   
   expect(g.gameIsFinished).toBe(true);
});