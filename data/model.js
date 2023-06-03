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

/**
 * registered TG bots
 */
const CBot = new m.Schema({
    botCode:String,
    apiKey:String,
    name:String,
    isOnline: Boolean,
    isDevMode: Boolean,
    ftpServer: String,
    ftpDir: String,
    ftpPwd: String,
    ftpUser: String,
    ftpPort: String
});

/**
 * user profile data
 */
const CProfile = new m.Schema({
    id: String, 
    fName: String,
    login: String,
    fullName: String,
    userRoles: [String],
    sName: String,
    lang: String,
    timeZone: Number
});

const MQuiz = m.model("quiz", CQuiz);
const MGameResult = m.model("gameresult", CGameResult);

// all plans of games
const MQuizPlan = m.model("quizplan", CQuizPlan);

const MBot = m.model("bot", CBot);

const MProfile = m.model("profile", CProfile);

module.exports = {
    CQuiz,
    MQuiz,
    MGameResult,
    MQuizPlan,
    MBot,
    MProfile
};