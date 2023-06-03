const { disconnectDb, startDb } = require("../data/db");
const { writeData } = require("../data/sample_001");
const { writeDataBot } = require("../data/sample_002_bots");
const { QuizGameBuilder } = require("../game_builder");

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

test("Bot settings", async ()=>{
    await startDb();
    await writeDataBot();
    await disconnectDb();
});