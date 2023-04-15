var m = require("mongoose");

const CQuiz = new m.Schema(
    {
        quizId: String,
        questionText: String,
        quizType: String, // m, s
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

const CQuizPlan = new m.Schema({
    planId: String,
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

const MQuiz = m.model("quiz", CQuiz);
const MGameResult = m.model("gameresult", CGameResult);
const MQuizPlan = m.model("quizplan", CQuizPlan);

module.exports = {
    CQuiz,
    MQuiz,
    MGameResult,
    MQuizPlan
};