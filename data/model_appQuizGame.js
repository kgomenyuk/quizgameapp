var m = require("mongoose");

/*        SCHEMAS        */

const CQuiz = new m.Schema(
    {
        quizId: String, // unique key
        questionText: String,
        quizType: String, // m, s
        lang: String, // language code
        options: [{
            optionId: Number,
            text: String,
            isCorrect: Boolean
        }],
        hasMedia: Boolean,
        image: Buffer,
        tags:[String]
    }
);
// quiz id now will be unique
CQuiz.index({quizId: 1}, {unique: true});

const CQuizPlan = new m.Schema({
    planId: String,
    title: String, 
    addedOn: Date, // time when it was created
    isSample: Boolean, // sample data
    ownerId:  Number, // owner of the quiz collection
    quizSections: [{
        sectionId: String,
        position: Number,
        quizData:[{
            quizId: String,
            position: Number
        }]
    }]
});

const CGameResult = new m.Schema({
    gameCode: String,
    rounds: Number,
    roundStats: [{
        round: Number,
        points: Number,
        quizWon: Number,
        isWinner: Boolean
    }]
});

/**
 * one game instance
 */
const CGameInstance= new m.Schema({
    state: String,
    id1:String,
    id2:String,
    id3:String,
    createdOn: Date,
    gameLog:[
        {
            createdOn: Date,
            eventId: String,
            userId: String
        }
    ],
    title: String,
    planId: String
});

const CQuizAnswer = new m.Schema({
    gameId:String,
    userId:String,
    team:{
        id:String,
        name:String
    }, // A = audience
    place:Number,
    options:[{
        missing:Boolean,
        correct:Boolean,
        optionId:String
    }],
    time:Date,
    result:Boolean,
    percentCorrect:Number
});

/*        MODELS        */

// a single question
const MQuiz = m.model("quiz", CQuiz);

// results of games
const MGameResult = m.model("gameresult", CGameResult);

// all plans of games
const MQuizPlan = m.model("quizplan", CQuizPlan);

// instances of 
const MGameInstance = m.model("game_instance", CGameInstance);

// answers of a user
const MQuizAnswer = m.model("quiz_answers", CQuizAnswer);


module.exports = {
    MQuiz,
    MGameResult,
    MQuizPlan,
    MGameInstance,
    MQuizAnswer
};