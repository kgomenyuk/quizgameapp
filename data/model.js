var m = require("mongoose");

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