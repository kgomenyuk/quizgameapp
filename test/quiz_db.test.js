const { disconnectDb, startDb } = require("../data/db");
const { writeData } = require("../data/sample_001");
const { writeDataBot } = require("../data/sample_002_bots");
const { QuizGameBuilder } = require("../game_builder");
const { UIScreen } = require("../lib/UIScreen");
const { QuizGame } = require("../quiz_game");
const { QuizGameManager } = require("../quizgame_manager");

test("Sample data can be written to the DB", async ()=>{
    await writeData();
    await disconnectDb();
});

test("Sample data can be read from DB", async ()=>{
    await startDb();
    var b = new QuizGameBuilder();
    await b.setQuizPlan('SQL_L7_Quiz');
    var game = await b.build();
    expect(game).not.toBeNull();
    await disconnectDb();
});

// scenario 1
// quiz master opens the first question
test("Questions are available in the quiz", async ()=>{
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

    game.addPlayer("", 1, 2000);

    game.addPlayer("", 2, 3000);

    game.setState("WAITING");
    
    game.setState("READY");

    await game.prepareQuestion();

    const text1 = game.display.questionText;
    expect(text1).toBe(`What will this query return?
SELECT * FROM A LEFT JOIN B ON 1 = 0`);

    const text2 = game.display.questionDisplayText;
    expect(text2).toContain("🐶 Nothing, if A is empty\n🦊 Cross product of A and B\n🐯 Nothing, if B is empty");

    /* 4 buttons. two in a row */
    var optionsButtons = [], optionsRow=[];
    game.display.options.forEach((x, i)=>{
        if(i%2 == 0){
            optionsRow = new Array();
            optionsButtons.push(optionsRow);
        }
        optionsRow.push({ text: x.value, callback_data: x.id });
    });

    // message to be sent to the players
    const msgText = 
`TEXT:
${game.display.questionDisplayText}
BUTTONS:
${JSON.stringify(optionsButtons)}
`;
    await game.postAnswer(2000, 2);

    expect(game).not.toBeNull();

    await disconnectDb();
});

// scenario 2. Player answers the question
test("Some player answers the question", async ()=>{
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

    const gm = new QuizGameManager(game, null);
    await gm.saveGameInstance();

    game.addPlayer("", 1, 2000);

    game.addPlayer("", 2, 3000);

    game.setState("WAITING");
    
    game.setState("READY");

    await game.prepareQuestion();
    
    await gm.postAnswer(2000, 2);// save the answer in the database

    expect(game.result.answerObject).not.toBeNull();
    expect(game.result.answerObject.answerId).not.toBeNull();

    expect(game.result.answered).toBeTruthy();

    expect(game.result.answerObject.options.find(x=>x.selected==true).optionId+"").toBe('2');

    await disconnectDb();
});

// scenario 3. Quiz master finishes the question
test("Question can be switched", async ()=>{
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

    const gm = new QuizGameManager(game, null);
    await gm.saveGameInstance();

    game.addPlayer("", 1, 2000);

    game.addPlayer("", 2, 3000);
    game.addPlayer("", 2, 3100);

    game.setState("WAITING");
    
    game.setState("READY");

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


/*typical game process 

1. game master: press start Round X
1.1. The teams receive a new message
1.2. Game master has a new button: Open question X
1.3. Start button disappears

2. Game master: press Open question X
2.1.

*/


test("Screen can be created from text", async () => {
    const screenTxt = 
`# GAME_MEMBERS
## TEAMS_LIST
The information about teams will appear in this message
{{ ? List of team members }}  
{{ X234 Names }}`;

    const lines = screenTxt.split("\n");
    // 1 line = message group
    // 2 line = message
    // 3->=== = contents

    

    const msgGroup = lines[0];
    const msgGroupExp = /(?<=[#]{1,1}[ ]*)[^# ].*(?=[ ]*)/;

    const msg = lines[1];
    const msgExp = /(?<=[#]{2,2}[ ]*)[^# ].*(?=[ ]*)/;

    const phExp = /{{[ ]*(?<name>[^ ]*)[ ]*(?<description>.*?)[ ]*}}/mgi;

    var msgGroupRes = msgGroupExp.exec(msgGroup);
    var msgRes = msgExp.exec(msg);

    var textArray = lines.reduce((p, c, i)=>{
        if(i<2 || p.eot == true){
            return p;
        }else{
            if(c == '==='){
                p.eot=true;
                return p;
            }
            p.textLines.push(c);
            return p;
        }
    }, { eot: false, textLines:[] })
    .textLines;

    // there must be at least 1 line with text
    const valid = (textArray.length >= 1);

    // parse placeholders
    const arrayPH = [];
    textArray.forEach((v, i) => {
        // any placeholders?
        var match = null;
        while ((match = phExp.exec(v)) != null ) {
            const name = match.groups.name;
            var description = match.groups.description;
            if(description == null){ description = ""; }
            arrayPH.push({ name, description });
        }
    });
    
});


test("Message groups 1", async () => {
    const def = 
`# GAME_MEMBERS
## TEAMS_LIST
The information about teams will appear in this message
{{ ? List of team members }}
{{ TEXT2 Name | Default text}}`;

    const s1 = new UIScreen();
    s1.fromTextDefinition(def);

    expect(s1.screenTag).toBe("GAME_MEMBERS");
    expect(s1.messages[0].tag).toBe("TEAMS_LIST");
    expect(s1.messages[0].placeholders[1][0]).toBe("TEXT2");
    
    const m = s1.getMessage("TEAMS_LIST");
    m.fillInitial();
    const txt = m.toText();
    expect(txt).toBe("The information about teams will appear in this message\n\n");

});


test("Message groups 2 - messages with buttons", async () => {
    const def = 
`# GAME_MEMBERS
## TEAMS_LIST
The information about teams will appear in this message
{{ ? List of team members }}
{{ TEXT2 Name | Default text}}
===
{{ buttonCode | button text | reference }}
{{ ? | 3 | btns }}
{{ i | name | mybutton2 }}`;

    const s1 = new UIScreen();
    s1.debug = true;

    s1.fromTextDefinition(def);

    expect(s1.screenTag).toBe("GAME_MEMBERS");
    expect(s1.messages[0].tag).toBe("TEAMS_LIST");
    expect(s1.messages[0].placeholders[1][0]).toBe("TEXT2");
    
    const m = s1.getMessage("TEAMS_LIST");
    m.fillInitial();
    const txt = m.toText();
    expect(txt).toBe("The information about teams will appear in this message\n\n");

    m.setBtnPlace("btns", [
        { text: "my button", code: "code" }, 
        { text: "my button", code: "code2" }]);

    m.createButtonsTable();

    var tgbtns = m.getTgButtons();
    expect(tgbtns[0][0].callback_data).toBe("buttonCode");

    expect(tgbtns[1][1].callback_data).toBe("code2");

    await s1.postMessage({}, "TEAMS_LIST", 100);

});

// message can be changed

test("Bot settings", async ()=>{
    await startDb();
    await writeDataBot();
    await disconnectDb();
});